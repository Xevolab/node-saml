import * as fs from "fs";
import { expect } from "chai";
import { parseStringPromise } from "xml2js";
import * as zlib from "zlib";
import { generateServiceProviderMetadata } from "../src/metadata";
import { SAML } from "../src/saml";
import { SamlConfig } from "../src/types";
import { parseDomFromString } from "../src/xml";
import { FAKE_CERT } from "./types";

const makeSaml = (overrides: Partial<SamlConfig> = {}) =>
	new SAML({
		callbackUrl: "https://sp.example.com/saml/consume",
		entryPoint: "https://idp.example.com/sso",
		issuer: "https://sp.example.com/metadata",
		idpCert: FAKE_CERT,
		allowCreate: false,
		disableRequestedAuthnContext: true,
		...overrides,
	});

const getAuthnRequest = async (saml: SAML) => {
	const message = await saml.getAuthorizeMessageAsync("", {});
	const encoded = message.request.SAMLRequest;
	if (typeof encoded !== "string") throw new Error("Expected a single encoded SAMLRequest");
	const xml = zlib.inflateRawSync(Buffer.from(encoded, "base64")).toString("utf8");
	return { message, request: await parseStringPromise(xml) };
};

describe("Xevolab fork behavior", function () {
	it("includes issuer hints and omits AllowCreate when false", async function () {
		const { request } = await getAuthnRequest(makeSaml());
		const authnRequest = request["samlp:AuthnRequest"];
		const issuer = authnRequest["saml:Issuer"][0];

		expect(issuer.$).to.include({
			Format: "urn:oasis:names:tc:SAML:2.0:nameid-format:entity",
			NameQualifier: "https://sp.example.com/saml/consume",
		});
		expect(authnRequest["samlp:NameIDPolicy"][0].$).not.to.have.property("AllowCreate");

		const allowCreateRequest = await getAuthnRequest(makeSaml({ allowCreate: true }));
		expect(allowCreateRequest.request["samlp:AuthnRequest"]["samlp:NameIDPolicy"][0].$).to.include({
			AllowCreate: "true",
		});
	});

	it("emits ProtocolBinding only when the ACS URL is included", async function () {
		const enabled = await getAuthnRequest(makeSaml({ assertionConsumerServiceIndex: "2" }));
		const enabledAttributes = enabled.request["samlp:AuthnRequest"].$;
		expect(enabledAttributes.AssertionConsumerServiceURL).to.equal(
			"https://sp.example.com/saml/consume",
		);
		expect(enabledAttributes.ProtocolBinding).to.equal(
			"urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
		);
		expect(enabledAttributes.AssertionConsumerServiceIndex).to.equal("2");

		const { request } = await getAuthnRequest(
			makeSaml({ assertionConsumerServiceIndex: "2", disableRequestAcsUrl: true }),
		);
		const attributes = request["samlp:AuthnRequest"].$;

		expect(attributes.AssertionConsumerServiceIndex).to.equal("2");
		expect(attributes).not.to.have.property("AssertionConsumerServiceURL");
		expect(attributes).not.to.have.property("ProtocolBinding");
	});

	it("returns the raw request, encoded message, and authorize URL", async function () {
		const saml = makeSaml();
		const message = await saml.getAuthorizeMessageAsync("", {
			additionalParams: { tenant: "north" },
		});
		const authorize = await saml.getAuthorizeUrlAsync("", {});

		expect(message.AuthnRequest).to.contain("<samlp:AuthnRequest");
		expect(message.request.SAMLRequest).to.be.a("string");
		expect(message.SAMLRequest).to.equal(message.request.SAMLRequest);
		expect(new URL(message.url).searchParams.get("tenant")).to.equal("north");
		expect(authorize.AuthnRequest).to.contain("<samlp:AuthnRequest");
		expect(new URL(authorize.url).searchParams.get("SAMLRequest")).to.be.a("string");

		const form = await saml.getAuthorizeFormAsync("", {
			additionalParams: { tenant: "north" },
		});
		expect(form).to.contain('name="SAMLRequest"');
		expect(form).to.contain('name="tenant" value="north"');
	});

	it("defaults metadata ACS index to zero and accepts the fork service alias", function () {
		const metadata = generateServiceProviderMetadata({
			issuer: "https://sp.example.com/metadata",
			callbackUrl: "https://sp.example.com/saml/consume",
			attributeConsumingServices: [
				{
					ServiceName: { "@xml:lang": "en", "#text": "Employee portal" },
					RequestedAttribute: [{ "@Name": "urn:oid:2.5.4.42" }],
				},
				{
					ServiceName: { "@xml:lang": "en", "#text": "Reporting" },
					RequestedAttribute: [{ "@Name": "urn:oid:2.5.4.4" }],
				},
			],
		});

		expect(metadata).to.contain('<AssertionConsumerService index="0"');
		expect(metadata).to.contain('<AttributeConsumingService index="0"');
		expect(metadata).to.contain('<AttributeConsumingService index="1"');
		expect(metadata).to.contain('Name="urn:oid:2.5.4.42"');
	});

	it("includes the public certificate in the signed metadata Signature KeyInfo", async function () {
		const privateKey = fs.readFileSync(`${__dirname}/static/acme_tools_com.key`);
		const publicCert = fs.readFileSync(`${__dirname}/static/acme_tools_com.cert`, "utf8");
		const metadata = generateServiceProviderMetadata({
			issuer: "https://sp.example.com/metadata",
			callbackUrl: "https://sp.example.com/saml/consume",
			privateKey,
			publicCerts: publicCert,
			signMetadata: true,
			signatureAlgorithm: "sha256",
			digestAlgorithm: "sha256",
		});
		const document = await parseDomFromString(metadata);
		const signature = document.getElementsByTagNameNS(
			"http://www.w3.org/2000/09/xmldsig#",
			"Signature",
		)[0];

		expect(
			signature?.getElementsByTagNameNS("http://www.w3.org/2000/09/xmldsig#", "KeyInfo").length,
		).to.equal(1);
	});
});
