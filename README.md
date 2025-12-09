This is a fork of the [node-saml package](https://github.com/node-saml/node-saml) repo to customize some of the functionality.

# What was changed?

** Metadata **

- Added the ability to include one or many `<AttributeConsumingService>` elements in the metadata
- Changed the default `<AssertionConsumerService>` index to 0 instead of 1
- Fixed an issue that didn't allow for the `<KeyInfo>` element to be included in the `<Signature>` element of the metadata

** AuthnRequest **

- Removed `AllowCreate` attribute if set to `false`
- Modified the `<saml:Issuer>` object by:
	- Adding attribute `Format="urn:oasis:names:tc:SAML:2.0:nameid-format:entity"`
	- Adding attribute `NameQualifier="https://idp-proxy.xevolab.dev"` with the same value as the object content
- Added `url` to `getAuthorizeMessageAsync`, allowing the dev to get both the URL and the un-encoded XML message
- Added `AuthnRequest` object to `getAuthorizeUrlAsync` to be used for logging purposes
- Changed the `NameQualifier` attribute to be the callback URL instead of the issuer
