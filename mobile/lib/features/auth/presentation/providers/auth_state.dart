import 'package:mobile/features/auth/domain/entities/user.dart';

/// Sentinel internal buat bedain "field ini gak di-pass ke copyWith" vs
/// "field ini emang sengaja di-set ke null". Tanpa ini, `copyWith(error:
/// null)` gak akan pernah bisa ngosongin error -- karena `null ?? old`
/// selalu balik ke nilai lama.
class _Unset {
  const _Unset();
}

const _unset = _Unset();

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

  /// Catatan pemakaian: buat field nullable (`user`, `error`), kirim
  /// eksplisit `null` kalau memang mau dikosongin (mis. `copyWith(error:
  /// null)` buat clearError). Kalau field-nya gak di-isi sama sekali,
  /// nilai lama otomatis dipertahankan -- gak perlu ubah cara manggilnya
  /// di notifier, sentinel-nya jalan di belakang layar.
  AuthState copyWith({
    bool? isLoading,
    bool? isLoggedIn,
    bool? isRegistered,
    Object? user = _unset,
    Object? error = _unset,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isLoggedIn: isLoggedIn ?? this.isLoggedIn,
      isRegistered: isRegistered ?? this.isRegistered,
      user: identical(user, _unset) ? this.user : user as AuthUser?,
      error: identical(error, _unset) ? this.error : error as String?,
    );
  }
}