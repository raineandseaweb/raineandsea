import { generateCSRFTokenWithSecret } from "@/lib/csrf";
import { withPublicRequest } from "@/lib/security/request-wrapper";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = generateCSRFTokenWithSecret();

  // Set the token in a cookie for easy access
  res.setHeader(
    "Set-Cookie",
    `csrf-token=${token}; HttpOnly; Path=/; Max-Age=${60 * 60}; SameSite=Strict`
  );

  return res.status(200).json({ csrfToken: token });
}

export default withPublicRequest(handler, "get_csrf_token");
