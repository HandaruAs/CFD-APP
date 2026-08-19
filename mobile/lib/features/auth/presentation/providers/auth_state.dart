import 'package:mobile/features/auth/domain/entities/user.dart';

class AuthState {
  final bool isLoading;
  final bool isLoggedIn;
  final bool isRegistered;
  final AuthUser? user;
  final String? error;

  AuthState({
    this.isLoading = false,
    this.isLoggedIn = false,
    this.isRegistered = false,
    this.user,
    this.error,
  });

  factory AuthState.initial() => AuthState();

  AuthState copyWith({
    bool? isLoading,
    bool? isLoggedIn,
    bool? isRegistered,
    AuthUser? user,
    String? error,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isLoggedIn: isLoggedIn ?? this.isLoggedIn,
      isRegistered: isRegistered ?? this.isRegistered,
      user: user ?? this.user,
      error: error ?? this.error,
    );
  }
}