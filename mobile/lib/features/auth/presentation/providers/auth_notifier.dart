import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:mobile/core/providers/nav_provider.dart';
import 'package:mobile/features/pedagang/presentation/providers/pedagang_provider.dart';
import 'package:mobile/features/petugas/presentation/providers/petugas_dashboard_provider.dart';
import 'package:mobile/features/petugas/presentation/providers/jam_operasional_provider.dart';
import 'package:mobile/features/petugas/presentation/providers/laporan_provider.dart';
import 'package:mobile/features/petugas/presentation/providers/sisa_lapak_provider.dart';
import 'package:mobile/features/petugas/presentation/providers/scan_provider.dart';
import 'auth_state.dart';

class AuthNotifier extends StateNotifier<AuthState> {
  final Ref ref;
  AuthNotifier(this.ref) : super(AuthState.initial());

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final user = await AuthRemoteDatasource.login(email: email, password: password);
      state = state.copyWith(isLoading: false, isLoggedIn: true, user: user);
      _resetSessionScopedState();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
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
      _resetSessionScopedState();
    } catch (_) {
      await AuthRemoteDatasource.logout();
      state = AuthState.initial();
    }
  }

  Future<void> register(String name, String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await AuthRemoteDatasource.register(name: name, email: email, password: password);
      state = state.copyWith(isLoading: false, isRegistered: true);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> logout() async {
    await AuthRemoteDatasource.logout();
    state = AuthState.initial();
    _resetSessionScopedState();
  }

  void _resetSessionScopedState() {
    ref.invalidate(menuListProvider);
    ref.invalidate(pedagangProvider);
    ref.invalidate(petugasDashboardProvider);
    ref.invalidate(jamOperasionalProvider);
    ref.invalidate(laporanProvider);
    ref.invalidate(sisaLapakProvider);
    ref.invalidate(scanProvider);
    ref.read(bottomNavIndexProvider.notifier).state = 0;
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}