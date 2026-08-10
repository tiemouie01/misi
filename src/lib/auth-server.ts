import { convexBetterAuthReactStart } from '@convex-dev/better-auth/react-start'

const convexUrl = process.env.VITE_CONVEX_URL!
const convexSiteUrl =
  process.env.VITE_CONVEX_SITE_URL ??
  convexUrl.replace(/\.convex\.cloud$/, '.convex.site')

export const {
  handler,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthReactStart({
  convexUrl,
  convexSiteUrl,
})
