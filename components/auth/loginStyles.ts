import { FontFamily, Radius, type AppTheme } from '@constants/theme';
/** Styles for the login/registration screen. */
import { StyleSheet } from 'react-native';

export const createLoginStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 18,
  },
  content: {
    padding: 18,
    paddingTop: 28,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mascotLogoWrap: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontFamily: FontFamily.medium,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.gray100,
    borderRadius: Radius.input,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.surface,
  },
  toggleText: {
    fontSize: 16,
    fontFamily: FontFamily.medium,
    color: theme.colors.textSecondary,
  },
  toggleTextActive: {
    color: theme.colors.primary,
  },
  form: {
    marginBottom: 32,
  },
  authPanel: {
    width: '100%',
  },
  authPanelContainer: {
    position: 'relative',
  },
  authPanelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
  },
  oauthSection: {
    marginBottom: 20,
  },
  oauthTitle: {
    fontSize: 16,
    fontFamily: FontFamily.medium,
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  oauthSubtitle: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  oauthSubtitleEmphasis: {
    color: theme.colors.infoStrong,
    fontFamily: FontFamily.medium,
  },
  manualIntro: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  manualToggleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.infoBorderStrong,
    backgroundColor: theme.colors.surface,
  },
  manualToggleText: {
    fontSize: 15,
    fontFamily: FontFamily.medium,
    color: theme.colors.infoLink,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: Radius.input,
    paddingHorizontal: 16,
    minHeight: 50,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  passwordRequirements: {
    backgroundColor: theme.colors.gray100,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  passwordRequirementsTitle: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  passwordRequirement: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.errorSurface,
    borderWidth: 1,
    borderColor: theme.colors.errorBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  errorText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    color: theme.colors.errorDark,
    fontSize: 14,
    lineHeight: 20,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    fontFamily: FontFamily.medium,
    color: theme.colors.primary,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontFamily: FontFamily.regular,
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    minHeight: 50,
    paddingVertical: 14,
    borderRadius: Radius.button,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: theme.colors.gray400,
  },
  loginButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: FontFamily.medium,
  },
  infoContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  methodSwapLink: {
    marginTop: 12,
    paddingVertical: 4,
  },
  methodSwapLinkText: {
    fontSize: 14,
    fontFamily: FontFamily.medium,
    color: theme.colors.infoLink,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.gray300,
  },
  dividerText: {
    marginHorizontal: 16,
    color: theme.colors.gray500,
    fontFamily: FontFamily.medium,
  },
  appleButton: {
    width: '100%',
    height: 50,
    marginBottom: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    paddingVertical: 16,
    borderRadius: Radius.input,
    marginBottom: 16,
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontFamily: FontFamily.medium,
    color: theme.colors.textPrimary,
  },
});
