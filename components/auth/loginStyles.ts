/** Styles for the login/registration screen. */
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F4',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 24,
  },
  content: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  mascotLogoWrap: {
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#222222',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6F756E',
    textAlign: 'center',
    lineHeight: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#1F4E3A',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6F756E',
  },
  toggleTextActive: {
    color: 'white',
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
    backgroundColor: '#FAF8F4',
  },
  oauthSection: {
    marginBottom: 20,
  },
  oauthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 6,
  },
  oauthSubtitle: {
    fontSize: 14,
    color: '#6F756E',
    lineHeight: 20,
    marginBottom: 16,
  },
  oauthSubtitleEmphasis: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  manualIntro: {
    fontSize: 14,
    color: '#6F756E',
    lineHeight: 20,
    marginBottom: 12,
  },
  manualToggleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#fff',
  },
  manualToggleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563eb',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  passwordRequirements: {
    backgroundColor: '#FAF8F4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  passwordRequirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },
  passwordRequirement: {
    fontSize: 13,
    color: '#6F756E',
    lineHeight: 18,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3f2',
    borderWidth: 1,
    borderColor: '#fecdca',
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
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    fontWeight: '600',
    color: '#1F4E3A',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#222222',
  },
  loginButton: {
    backgroundColor: '#1F4E3A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  infoContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#6F756E',
    textAlign: 'center',
    lineHeight: 20,
  },
  methodSwapLink: {
    marginTop: 12,
    paddingVertical: 4,
  },
  methodSwapLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontWeight: '600',
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
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
});