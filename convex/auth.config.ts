// We sanitize the domain to ensure no duplicate protocol prefixes or trailing slashes
// which can cause "No auth provider found" errors in Convex.
// The domain must match the 'iss' claim in your Clerk JWT template.
const rawDomain = process.env.CLERK_FRONTEND_API_URL || "";
const cleanDomain = rawDomain.replace(/^(https?:\/\/|\/\/)/, "").replace(/\/+$/, "");
const issuerDomain = `https://${cleanDomain}`;

export default {
  providers: [
    {
      domain: issuerDomain,
      applicationID: "convex",
    },
  ],
};
