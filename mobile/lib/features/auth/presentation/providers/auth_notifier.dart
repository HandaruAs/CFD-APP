import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'auth_state.dart';

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(AuthState.initial());

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final user = await AuthRemoteDatasource.login(
        email: email,
        password: password,
      );

      state = state.copyWith(
        isLoading: false,
        isLoggedIn: true,
        user: user,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> tryAutoLogin() async {
  state = state.copyWith(isLoading: true, error: null);

  try {
    final token = await AuthRemoteDatasource.getToken();
    if (token == null) {
      state = state.copyWith(isLoading: false, isLoggedIn: false);
      return;
    }

    final user = await AuthRemoteDatasource.getMe();
    state = state.copyWith(isLoading: false, isLoggedIn: true, user: user);
  } catch (_) {
    await AuthRemoteDatasource.logout();
    state = AuthState.initial();
  }
}

  Future<void> register(String name, String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await AuthRemoteDatasource.register(
        name: name,
        email: email,
        password: password,
      );
      state = state.copyWith(
        isLoading: false,
        isRegistered: true,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> logout() async {
    await AuthRemoteDatasource.logout();
    state = AuthState.initial();
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}