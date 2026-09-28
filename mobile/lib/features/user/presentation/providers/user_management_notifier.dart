import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/user/data/datasources/user_remote_datasource.dart';
import 'package:mobile/features/user/domain/entities/managed_user.dart';
import 'user_management_state.dart';

/// Satu notifier per role (lihat family di user_management_provider.dart).
///
/// Petugas & superadmin: search/status/page dikerjain server.
/// Pedagang: backend balikin semua data sekaligus, jadi list lengkapnya
/// disimpan di [_semuaPedagang] lalu difilter + dipotong per 10 di sini.
class UserManagementNotifier extends StateNotifier<UserManagementState> {
  final UserRole role;

  static const _limit = 10;

  Timer? _debounce;
  int _reqId = 0; // buang response basi kalau ada request yang lebih baru
  List<ManagedUser> _semuaPedagang = const [];

  UserManagementNotifier(this.role) : super(const UserManagementState());

  bool get _lokal => role == UserRole.pedagang;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  // ------------------------------------------------------------- load

  Future<void> load() async {
    final id = ++_reqId;
    state = state.copyWith(isLoading: true, error: null);
    try {
      if (_lokal) {
        final hasil = await UserRemoteDatasource.list(role);
        if (id != _reqId || !mounted) return;
        _semuaPedagang = hasil.users;
        _terapkanLokal(halaman: 1);
      } else {
        final hasil = await UserRemoteDatasource.list(
          role,
          search: state.search,
          status: state.status,
          page: 1,
          limit: _limit,
        );
        if (id != _reqId || !mounted) return;
        state = state.copyWith(
          isLoading: false,
          users: hasil.users,
          total: hasil.total,
          page: 1,
        );
      }
      _muatStats();
    } catch (e) {
      if (id != _reqId || !mounted) return;
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadMore() async {
    if (state.isLoading || state.isLoadingMore || !state.hasMore) return;

    if (_lokal) {
      _terapkanLokal(halaman: state.page + 1);
      return;
    }

    final id = _reqId;
    state = state.copyWith(isLoadingMore: true);
    try {
      final hasil = await UserRemoteDatasource.list(
        role,
        search: state.search,
        status: state.status,
        page: state.page + 1,
        limit: _limit,
      );
      if (id != _reqId || !mounted) return;
      state = state.copyWith(
        isLoadingMore: false,
        users: [...state.users, ...hasil.users],
        total: hasil.total,
        page: state.page + 1,
      );
    } catch (e) {
      if (id != _reqId || !mounted) return;
      state = state.copyWith(isLoadingMore: false, error: e.toString());
    }
  }

  // ---------------------------------------------------- search & filter

  void setSearch(String value) {
    state = state.copyWith(search: value);
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      if (_lokal) {
        _terapkanLokal(halaman: 1);
      } else {
        load();
      }
    });
  }

  void setStatus(String value) {
    if (value == state.status) return;
    state = state.copyWith(status: value);
    if (_lokal) {
      _terapkanLokal(halaman: 1);
    } else {
      load();
    }
  }

  // ------------------------------------------------------------- CRUD
  // Semua balikin pesan error (null = sukses) biar UI tinggal nampilin.

  Future<String?> create(UserFormData data) =>
      _jalankan(() => UserRemoteDatasource.create(role, data));

  Future<String?> update(String id, UserFormData data) =>
      _jalankan(() => UserRemoteDatasource.update(role, id, data));

  Future<String?> delete(String id) =>
      _jalankan(() => UserRemoteDatasource.delete(role, id));

  Future<String?> _jalankan(Future<void> Function() aksi) async {
    try {
      await aksi();
    } catch (e) {
      return e.toString();
    }
    if (mounted) await load();
    return null;
  }

  // ---------------------------------------------------------- internal

  /// Filter + potong list pedagang di sisi klien.
  void _terapkanLokal({required int halaman}) {
    final q = state.search.trim().toLowerCase();

    final cocok = _semuaPedagang.where((u) {
      if (state.status == 'active' && !u.active) return false;
      if (state.status == 'suspended' && u.active) return false;
      if (q.isEmpty) return true;
      return [u.name, u.email, u.phone, u.namaUsaha ?? '']
          .any((s) => s.toLowerCase().contains(q));
    }).toList();

    final batas = halaman * _limit;
    final akhir = batas > cocok.length ? cocok.length : batas;
    state = state.copyWith(
      isLoading: false,
      isLoadingMore: false,
      users: cocok.sublist(0, akhir),
      total: cocok.length,
      page: halaman,
    );
  }

  Future<void> _muatStats() async {
    try {
      final s = await UserRemoteDatasource.stats(role);
      if (mounted) state = state.copyWith(stats: s);
    } catch (_) {
      // Statistik cuma pelengkap -- gagal ya sudah, list tetap tampil.
    }
  }
}