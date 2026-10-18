/**
 * 이메일을 주지 않는 소셜 계정(카카오 비즈 앱 전환 전 등)에 붙이는 대체 이메일 도메인.
 * 예: kakao_1234567890@social.lifeinbloom.local — 회원 식별용일 뿐 실제로 메일을 받을 수 없다.
 */
export const SOCIAL_PLACEHOLDER_EMAIL_DOMAIN = "social.lifeinbloom.local"

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${SOCIAL_PLACEHOLDER_EMAIL_DOMAIN}`)
}
