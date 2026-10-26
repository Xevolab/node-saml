# Xevolab Fork Changes

This file records the fork-specific behavior to preserve when rebasing on `node-saml/node-saml`.
The upstream README remains unchanged.

## AuthnRequest

- The `saml:Issuer` includes `Format="urn:oasis:names:tc:SAML:2.0:nameid-format:entity"` and uses `callbackUrl` as `NameQualifier`.
- `NameIDPolicy` omits `AllowCreate` when `allowCreate` is false; it emits `true` when enabled.
- `assertionConsumerServiceIndex` adds `AssertionConsumerServiceIndex` to the request.
- `ProtocolBinding` is present only when the request includes `AssertionConsumerServiceURL`.
- `getAuthorizeUrlAsync` returns the XML as `AuthnRequest` plus the generated `url`.
- `getAuthorizeMessageAsync` returns the raw XML, encoded query map in `request`, generated `url`, and top-level message parameters.

## Metadata

- `AssertionConsumerService` defaults to index `0`.
- `attributeConsumingServices` remains supported alongside upstream's `metadataAttributeConsumingServices`; its single-name service shape is accepted and missing indices are assigned by array order.
- Signed metadata includes the first public certificate in the signature's `KeyInfo`.

## Package

- Keep the package name `@xevolab/node-saml` and the Xevolab repository URL when importing upstream package changes.
- Run the focused regression suite with `npm run test:fork`. The spec is `test/fork-behavior.spec.ts`.
