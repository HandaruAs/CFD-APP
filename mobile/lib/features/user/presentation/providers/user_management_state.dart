import 'package:mobile/features/user/domain/entities/managed_user.dart';

class _Unset {
  const _Unset();
}

const _unset = _Unset();

class UserManagementState {
  final bool isLoading; // load awal / ganti filter
  final bool isLoadingMore; // halaman berikutnya (infinite scroll)
  final String? error;
  final List<ManagedUser> users;
  final int total;
  final int page;
  final String search;

  /// '' = semua, 'active', 'suspended'
  final String status;
  final UserStats? stats;

  const UserManagementState({
    this.isLoading = false,
    this.isLoadingMore = false,
    this.error,
    this.users = const [],
    this.total = 0,
    this.page = 1,
    this.search = '',
    this.status = '',
    this.stats,
  });

  bool get hasMore => users.length < total;

  UserManagementState copyWith({
    bool? isLoading,
    bool? isLoadingMore,
    Object? error = _unset,
    List<ManagedUser>? users,
    int? total,
    int? page,
    String? search,
    String? status,
    Object? stats = _unset,
  }) {
    return UserManagementState(
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      error: identical(error, _unset) ? this.error : error as String?,
      users: users ?? this.users,
      total: total ?? this.total,
      page: page ?? this.page,
      search: search ?? this.search,
      status: status ?? this.status,
      stats: identical(stats, _unset) ? this.stats : stats as UserStats?,
    );
  }
}