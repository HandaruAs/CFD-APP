import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/domain/entities/user.dart';
import 'auth_notifier.dart';
import 'auth_state.dart';

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});

final userProvider = Provider<AuthUser?>((ref) {
  final state = ref.watch(authProvider);
  return state.user;
});

final isLoggedInProvider = Provider<bool>((ref) {
  final state = ref.watch(authProvider);
  return state.isLoggedIn;
});

final isLoadingProvider = Provider<bool>((ref) {
  final state = ref.watch(authProvider);
  return state.isLoading;
});

final authErrorProvider = Provider<String?>((ref) {
  final state = ref.watch(authProvider);
  return state.error;
});