import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/themes/app_theme.dart';
import 'package:mobile/features/user/domain/entities/managed_user.dart';
import 'package:mobile/features/user/presentation/providers/user_management_notifier.dart';
import 'package:mobile/features/user/presentation/providers/user_management_provider.dart';
import 'package:mobile/features/user/presentation/providers/user_management_state.dart';

const _jenisDaganganLabel = {
  'makanan_minuman': 'Makanan & Minuman',
  'bukan_makanan_minuman': 'Bukan Makanan & Minuman',
};

const _jenisLapakLabel = {
  'rombong': 'Rombong',
  'meja': 'Meja',
};

/// BODY Manajemen User buat satu role (bukan halaman penuh -- Scaffold
/// dan AppBar udah dipegang MainLayout). Mirror web: statistik,
/// pencarian, filter status, daftar dengan infinite scroll, tambah, edit,
/// dan hapus.
///
/// Tambah user tersedia buat semua role. Buat pedagang, formnya ikut
/// minta NIK, tanggal lahir, dan data usaha (syarat dari backend).
class UserManagementScreen extends ConsumerStatefulWidget {
  final UserRole role;

  const UserManagementScreen({super.key, required this.role});

  @override
  ConsumerState<UserManagementScreen> createState() => _UserManagementScreenState();
}

class _UserManagementScreenState extends ConsumerState<UserManagementScreen>
    with AutomaticKeepAliveClientMixin {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  bool get wantKeepAlive => true;

  UserManagementNotifier get _notifier =>
      ref.read(userManagementProvider(widget.role).notifier);

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _notifier.load());
    _scrollController.addListener(() {
      if (_scrollController.position.pixels >=
          _scrollController.position.maxScrollExtent - 200) {
        _notifier.loadMore();
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _bukaForm({ManagedUser? user}) async {
    final messenger = ScaffoldMessenger.of(context);
    final pesan = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _UserFormSheet(
        role: widget.role,
        user: user,
        onSubmit: (data) =>
            user == null ? _notifier.create(data) : _notifier.update(user.id, data),
        onDelete: user == null ? null : () => _notifier.delete(user.id),
      ),
    );
    if (pesan != null) {
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(pesan)));
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context); // wajib buat AutomaticKeepAliveClientMixin
    final state = ref.watch(userManagementProvider(widget.role));

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _bukaForm(),
        backgroundColor: kBrandColor,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: Text('Tambah ${widget.role.label}'),
      ),
      body: Column(
        children: [
          if (state.stats != null) _StatsRow(stats: state.stats!),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: TextField(
              controller: _searchController,
              onChanged: _notifier.setSearch,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: widget.role == UserRole.pedagang
                    ? 'Cari nama, email, telepon, atau usaha'
                    : 'Cari nama, email, atau telepon',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: state.search.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () {
                          _searchController.clear();
                          _notifier.setSearch('');
                        },
                      ),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Row(
              children: [
                for (final f in const [
                  ('', 'Semua'),
                  ('active', 'Aktif'),
                  ('suspended', 'Ditangguhkan'),
                ])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(f.$2),
                      selected: state.status == f.$1,
                      onSelected: (_) => _notifier.setStatus(f.$1),
                      selectedColor: kBrandColor.withValues(alpha: 0.14),
                      labelStyle: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: state.status == f.$1 ? kBrandColor : Colors.black87,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(child: _buildList(state)),
        ],
      ),
    );
  }

  Widget _buildList(UserManagementState state) {
    if (state.isLoading && state.users.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null && state.users.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(state.error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: _notifier.load,
                child: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _notifier.load,
      child: state.users.isEmpty
          ? ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: const [
                SizedBox(height: 80),
                Icon(Icons.person_search, size: 48, color: Colors.black26),
                SizedBox(height: 8),
                Center(child: Text('Tidak ada data yang cocok.')),
              ],
            )
          : ListView.separated(
              controller: _scrollController,
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
              itemCount: state.users.length + (state.isLoadingMore ? 1 : 0),
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                if (i >= state.users.length) {
                  return const Padding(
                    padding: EdgeInsets.all(16),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                final u = state.users[i];
                return _UserTile(
                  user: u,
                  isPedagang: widget.role == UserRole.pedagang,
                  onTap: () => _bukaForm(user: u),
                );
              },
            ),
    );
  }
}

// ---------------------------------------------------------------- widgets

class _StatsRow extends StatelessWidget {
  final UserStats stats;

  const _StatsRow({required this.stats});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        children: [
          _StatCard(label: 'Total', value: stats.total, color: kBrandColor),
          const SizedBox(width: 8),
          _StatCard(label: 'Aktif', value: stats.active, color: Colors.green.shade700),
          const SizedBox(width: 8),
          _StatCard(
            label: 'Ditangguhkan',
            value: stats.suspended,
            color: Colors.orange.shade800,
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final int value;
  final Color color;

  const _StatCard({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '$value',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color),
            ),
            Text(
              label,
              style: const TextStyle(fontSize: 12, color: Colors.black54),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

class _UserTile extends StatelessWidget {
  final ManagedUser user;
  final bool isPedagang;
  final VoidCallback onTap;

  const _UserTile({
    required this.user,
    required this.isPedagang,
    required this.onTap,
  });

  /// joinedAt dari backend bentuknya bisa "2026-09-14 02:54:49 +0000 UTC"
  /// atau ISO -- ambil 10 karakter pertama kalau formatnya yyyy-mm-dd.
  String get _bergabung {
    final m = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(user.joinedAt);
    if (m == null) return user.joinedAt;
    return '${m.group(3)}/${m.group(2)}/${m.group(1)}';
  }

  @override
  Widget build(BuildContext context) {
    final baris2 = isPedagang && user.namaUsaha != null ? user.namaUsaha! : user.email;
    final baris3 = [
      if (user.phone.isNotEmpty) user.phone,
      if (_bergabung.isNotEmpty) 'Bergabung $_bergabung',
    ].join(' · ');

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: kBrandColor.withValues(alpha: 0.12),
                child: Text(
                  user.initial,
                  style: const TextStyle(color: kBrandColor, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user.name,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      baris2,
                      style: const TextStyle(fontSize: 13, color: Colors.black87),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (baris3.isNotEmpty)
                      Text(
                        baris3,
                        style: const TextStyle(fontSize: 12, color: Colors.black54),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              _StatusBadge(active: user.active),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final bool active;

  const _StatusBadge({required this.active});

  @override
  Widget build(BuildContext context) {
    final color = active ? Colors.green.shade700 : Colors.orange.shade800;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        active ? 'Aktif' : 'Ditangguhkan',
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color),
      ),
    );
  }
}

// ------------------------------------------------------------- form sheet

/// Bottom sheet tambah (user == null) / edit user. Nutup sendiri dengan
/// pesan sukses (String) yang nanti ditampilin sebagai SnackBar oleh
/// layar induk.
class _UserFormSheet extends StatefulWidget {
  final UserRole role;
  final ManagedUser? user;
  final Future<String?> Function(UserFormData data) onSubmit;
  final Future<String?> Function()? onDelete;

  const _UserFormSheet({
    required this.role,
    required this.user,
    required this.onSubmit,
    required this.onDelete,
  });

  @override
  State<_UserFormSheet> createState() => _UserFormSheetState();
}

class _UserFormSheetState extends State<_UserFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _email;
  late final TextEditingController _phone;
  late final TextEditingController _password;
  late final TextEditingController _nik;
  late final TextEditingController _tanggalLahir; // tampil dd/mm/yyyy
  late final TextEditingController _namaUsaha;
  String? _tanggalLahirIso; // yyyy-mm-dd, yang dikirim ke backend
  String? _jenisDagangan;
  String? _jenisLapak;

  bool _saving = false;
  bool _hidePassword = true;
  String? _error;

  bool get _edit => widget.user != null;
  bool get _pedagang => widget.role == UserRole.pedagang;

  @override
  void initState() {
    super.initState();
    final u = widget.user;
    _name = TextEditingController(text: u?.name ?? '');
    _email = TextEditingController(text: u?.email ?? '');
    _phone = TextEditingController(text: u?.phone ?? '');
    _password = TextEditingController();
    _nik = TextEditingController(text: u?.nik ?? '');
    _tanggalLahir = TextEditingController();
    _namaUsaha = TextEditingController(text: u?.namaUsaha ?? '');
    _jenisDagangan =
        _jenisDaganganLabel.containsKey(u?.jenisDagangan) ? u?.jenisDagangan : null;
    _jenisLapak = _jenisLapakLabel.containsKey(u?.jenisLapak) ? u?.jenisLapak : null;
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    _nik.dispose();
    _tanggalLahir.dispose();
    _namaUsaha.dispose();
    super.dispose();
  }

  String? _wajib(String? v, String label) =>
      (v == null || v.trim().isEmpty) ? '$label wajib diisi' : null;

  Future<void> _pilihTanggalLahir() async {
    final sekarang = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(sekarang.year - 30),
      firstDate: DateTime(1940),
      lastDate: sekarang,
      helpText: 'Tanggal lahir',
    );
    if (picked == null) return;
    String dua(int n) => n.toString().padLeft(2, '0');
    setState(() {
      _tanggalLahirIso = '${picked.year}-${dua(picked.month)}-${dua(picked.day)}';
      _tanggalLahir.text = '${dua(picked.day)}/${dua(picked.month)}/${picked.year}';
    });
  }

  Future<void> _simpan() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });

    final err = await widget.onSubmit(UserFormData(
      name: _name.text,
      email: _email.text,
      phone: _phone.text,
      password: _password.text,
      nik: _nik.text,
      tanggalLahir: _tanggalLahirIso ?? '',
      namaUsaha: _namaUsaha.text,
      jenisDagangan: _jenisDagangan ?? '',
      jenisLapak: _jenisLapak ?? '',
    ));
    if (!mounted) return;

    if (err != null) {
      setState(() {
        _saving = false;
        _error = err;
      });
      return;
    }
    Navigator.of(context).pop(
      _edit ? 'Data berhasil diperbarui' : '${widget.role.label} berhasil ditambahkan',
    );
  }

  Future<void> _hapus() async {
    final yakin = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Hapus ${widget.role.label}?'),
        content: Text('${widget.user!.name} akan dihapus dan tidak bisa login lagi.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );
    if (yakin != true || !mounted) return;

    setState(() {
      _saving = true;
      _error = null;
    });
    final err = await widget.onDelete!();
    if (!mounted) return;

    if (err != null) {
      setState(() {
        _saving = false;
        _error = err;
      });
      return;
    }
    Navigator.of(context).pop('${widget.role.label} berhasil dihapus');
  }

  @override
  Widget build(BuildContext context) {
    final judul = _edit ? 'Edit ${widget.role.label}' : 'Tambah ${widget.role.label}';

    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        0,
        20,
        20 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(judul, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              TextFormField(
                controller: _name,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Nama', border: OutlineInputBorder()),
                validator: (v) => _wajib(v, 'Nama'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _email,
                enabled: !_edit, // email gak bisa diubah dari endpoint update
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
                validator: (v) {
                  if (_edit) return null;
                  final s = v?.trim() ?? '';
                  if (s.isEmpty) return 'Email wajib diisi';
                  if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(s)) {
                    return 'Format email tidak valid';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'No. Telepon', border: OutlineInputBorder()),
                validator: (v) => _wajib(v, 'No. telepon'),
              ),
              if (!_edit) ...[
                const SizedBox(height: 12),
                TextFormField(
                  controller: _password,
                  obscureText: _hidePassword,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    helperText: 'Minimal 8 karakter',
                    border: const OutlineInputBorder(),
                    suffixIcon: IconButton(
                      icon: Icon(_hidePassword ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setState(() => _hidePassword = !_hidePassword),
                    ),
                  ),
                  validator: (v) =>
                      (v == null || v.length < 8) ? 'Password minimal 8 karakter' : null,
                ),
              ],
              if (_pedagang) ...[
                // NIK & tanggal lahir cuma diisi pas tambah; endpoint update
                // gak nerima keduanya, jadi pas edit NIK ditampilin read-only.
                if (!_edit) ...[
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _nik,
                    keyboardType: TextInputType.number,
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(16),
                    ],
                    decoration: const InputDecoration(
                      labelText: 'NIK',
                      helperText: '16 digit',
                      border: OutlineInputBorder(),
                    ),
                    validator: (v) =>
                        (v ?? '').length == 16 ? null : 'NIK harus 16 digit',
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _tanggalLahir,
                    readOnly: true,
                    onTap: _pilihTanggalLahir,
                    decoration: const InputDecoration(
                      labelText: 'Tanggal Lahir',
                      border: OutlineInputBorder(),
                      suffixIcon: Icon(Icons.calendar_today_outlined),
                    ),
                    validator: (_) =>
                        _tanggalLahirIso == null ? 'Tanggal lahir wajib diisi' : null,
                  ),
                ] else if (widget.user!.nik != null) ...[
                  const SizedBox(height: 12),
                  TextFormField(
                    initialValue: widget.user!.nik,
                    enabled: false,
                    decoration: const InputDecoration(labelText: 'NIK', border: OutlineInputBorder()),
                  ),
                ],
                const SizedBox(height: 12),
                TextFormField(
                  controller: _namaUsaha,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(labelText: 'Nama Usaha', border: OutlineInputBorder()),
                  validator: (v) => _wajib(v, 'Nama usaha'),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  // ignore: deprecated_member_use
                  value: _jenisDagangan,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Jenis Dagangan', border: OutlineInputBorder()),
                  items: [
                    for (final e in _jenisDaganganLabel.entries)
                      DropdownMenuItem(value: e.key, child: Text(e.value)),
                  ],
                  onChanged: (v) => setState(() => _jenisDagangan = v),
                  validator: (v) => v == null ? 'Pilih jenis dagangan' : null,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  // ignore: deprecated_member_use
                  value: _jenisLapak,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Jenis Lapak', border: OutlineInputBorder()),
                  items: [
                    for (final e in _jenisLapakLabel.entries)
                      DropdownMenuItem(value: e.key, child: Text(e.value)),
                  ],
                  onChanged: (v) => setState(() => _jenisLapak = v),
                  validator: (v) => v == null ? 'Pilih jenis lapak' : null,
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: Colors.red)),
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _saving ? null : _simpan,
                style: FilledButton.styleFrom(
                  backgroundColor: kBrandColor,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: _saving
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(_edit ? 'Simpan Perubahan' : 'Tambah'),
              ),
              if (_edit && widget.onDelete != null) ...[
                const SizedBox(height: 8),
                TextButton.icon(
                  onPressed: _saving ? null : _hapus,
                  style: TextButton.styleFrom(foregroundColor: Colors.red),
                  icon: const Icon(Icons.delete_outline),
                  label: Text('Hapus ${widget.role.label}'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}