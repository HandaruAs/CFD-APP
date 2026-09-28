import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/themes/app_theme.dart';
import 'package:mobile/features/petugas/presentation/pages/laporan_screen.dart';
import 'package:mobile/features/superadmin/domain/entities/manajemen_lapak.dart';
import 'package:mobile/features/superadmin/presentation/providers/manajemen_lapak_notifier.dart';
import 'package:mobile/features/superadmin/presentation/providers/manajemen_lapak_provider.dart';
import 'package:mobile/features/superadmin/presentation/providers/manajemen_lapak_state.dart';

/// BODY "Manajemen Lapak" (superadmin) -- 2 tab, sama kayak web:
///   - Ruas & Kuota : kecamatan -> jalan -> ruas
///   - Laporan      : laporan kehadiran & omset pedagang (LaporanScreen,
///                    dipakai bareng petugas -- endpoint /api/petugas/laporan)
class ManajemenLapakScreen extends StatelessWidget {
  const ManajemenLapakScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          Material(
            color: Theme.of(context).colorScheme.surface,
            child: TabBar(
              labelColor: kBrandColor,
              indicatorColor: kBrandColor,
              tabs: const [
                Tab(text: 'Ruas & Kuota'),
                Tab(text: 'Laporan'),
              ],
            ),
          ),
          const Expanded(
            child: TabBarView(
              children: [
                _RuasKuotaTab(),
                LaporanScreen(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// BODY "Manajemen Lapak" > tab Ruas & Kuota (bukan halaman penuh --
/// Scaffold/AppBar dipegang MainLayout).
///
/// Kecamatan, Jalan, dan Ruas digabung jadi SATU layar (nurutin grup
/// permission "penataan.manage" yang sama di backend, dan alurnya emang
/// saling gantung: ruas butuh jalan, jalan butuh kecamatan) -- tapi
/// alurnya drill-down 2 langkah (pilih Kecamatan -> pilih Jalan) baru
/// nampilin ruas, BUKAN 4 tabel ditumpuk kayak versi web yang bakal
/// kepotong & susah discroll di layar HP.
///
/// Aksi tambah/edit/hapus Kecamatan & Jalan ada di menu titik-tiga
/// (ikon vertical_more) di samping tiap dropdown. Kecamatan cuma
/// Tambah & Hapus (backend gak sediain rename). Event tetap jadi menu
/// terpisah (permission "jadwal.manage").
class _RuasKuotaTab extends ConsumerStatefulWidget {
  const _RuasKuotaTab();

  @override
  ConsumerState<_RuasKuotaTab> createState() => _RuasKuotaTabState();
}

class _RuasKuotaTabState extends ConsumerState<_RuasKuotaTab>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(manajemenLapakProvider.notifier).load());
  }

  @override
  Widget build(BuildContext context) {
    super.build(context); // wajib buat AutomaticKeepAliveClientMixin
    final state = ref.watch(manajemenLapakProvider);
    final notifier = ref.read(manajemenLapakProvider.notifier);

    return RefreshIndicator(
      onRefresh: notifier.load,
      child: _buildBody(context, state, notifier),
    );
  }

  Widget _buildBody(BuildContext context, ManajemenLapakState state, ManajemenLapakNotifier notifier) {
    if (state.isLoading && state.wilayah.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.error != null && state.wilayah.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 80),
          const Icon(Icons.error_outline, color: Colors.red, size: 48),
          const SizedBox(height: 12),
          Text(state.error!, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          Center(
            child: ElevatedButton(
              onPressed: notifier.load,
              style: ElevatedButton.styleFrom(backgroundColor: kBrandColor),
              child: const Text('Coba Lagi', style: TextStyle(color: Colors.white)),
            ),
          ),
        ],
      );
    }

    if (state.wilayah.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: const [
          SizedBox(height: 80),
          Center(child: Text('Belum ada data kecamatan/jalan.')),
        ],
      );
    }

    final jalan = state.jalanDipilih;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _Dropdown<String>(
                label: 'Kecamatan',
                value: state.kecamatanKey,
                items: [
                  for (final e in state.kecamatanOpsi)
                    DropdownMenuItem(value: e.key, child: Text(e.value.nama)),
                ],
                onChanged: notifier.setKecamatan,
              ),
            ),
            _ActionMenu(
              items: [
                _ActionItem('tambah', 'Tambah Kecamatan', Icons.add),
                if (state.kecamatanBisaDihapus)
                  _ActionItem('hapus', 'Hapus Kecamatan Ini', Icons.delete_outline, merah: true),
              ],
              onSelected: (value) {
                if (value == 'tambah') _openKecamatanDialog(context, ref);
                if (value == 'hapus' && state.kecamatanDipilih != null) {
                  _confirmDeleteKecamatan(context, ref, state.kecamatanDipilih!);
                }
              },
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: _Dropdown<String>(
                label: 'Jalan',
                value: state.jalanOpsi.any((j) => j.id == state.jalanId) ? state.jalanId : null,
                enabled: state.jalanOpsi.isNotEmpty,
                helper: state.jalanOpsi.isEmpty ? 'Kecamatan ini belum punya jalan' : null,
                items: [
                  for (final j in state.jalanOpsi)
                    DropdownMenuItem(value: j.id, child: Text('${j.kodeJalan} - ${j.namaJalan}')),
                ],
                onChanged: notifier.setJalan,
              ),
            ),
            _ActionMenu(
              items: [
                if (state.bisaTambahJalan) _ActionItem('tambah', 'Tambah Jalan', Icons.add),
                if (jalan != null) _ActionItem('edit', 'Edit Jalan Ini', Icons.edit_outlined),
                if (jalan != null)
                  _ActionItem('hapus', 'Hapus Jalan Ini', Icons.delete_outline, merah: true),
              ],
              onSelected: (value) {
                final kecId = state.kecamatanDipilih?.id;
                if (value == 'tambah' && kecId != null) {
                  _openJalanFormDialog(context, ref, kecamatanId: kecId);
                }
                if (value == 'edit' && jalan != null) {
                  _openJalanFormDialog(context, ref, kecamatanId: null, jalan: jalan);
                }
                if (value == 'hapus' && jalan != null) {
                  _confirmDeleteJalan(context, ref, jalan);
                }
              },
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (jalan != null) ...[
          _JalanSummaryCard(jalan: jalan),
          const SizedBox(height: 16),
          Row(
            children: [
              const Text('Daftar Ruas', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              const Spacer(),
              TextButton.icon(
                onPressed: () => _openRuasDialog(context, ref, jalan: jalan),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Tambah'),
                style: TextButton.styleFrom(foregroundColor: kBrandColor),
              ),
            ],
          ),
          const SizedBox(height: 4),
          if (jalan.ruas.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 32),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.03),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Column(
                children: [
                  Icon(Icons.signpost_outlined, color: Colors.black38, size: 32),
                  SizedBox(height: 8),
                  Text('Belum ada ruas di jalan ini.', style: TextStyle(color: Colors.black54)),
                ],
              ),
            )
          else
            for (final r in jalan.ruas) ...[
              _RuasCard(jalan: jalan, ruas: r),
              const SizedBox(height: 10),
            ],
        ],
      ],
    );
  }
}

// ---------------------------------------------------------------- widgets

class _Dropdown<T> extends StatelessWidget {
  final String label;
  final T? value;
  final bool enabled;
  final String? helper;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;

  const _Dropdown({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
    this.enabled = true,
    this.helper,
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<T>(
      // ignore: deprecated_member_use
      value: value,
      isExpanded: true,
      items: items,
      onChanged: enabled ? onChanged : null,
      decoration: InputDecoration(
        labelText: label,
        helperText: helper,
        border: const OutlineInputBorder(),
        filled: !enabled,
        fillColor: enabled ? null : Colors.black.withValues(alpha: 0.04),
      ),
    );
  }
}

/// Menu titik-tiga kecil di samping dropdown Kecamatan/Jalan, isinya
/// aksi tambah/edit/hapus buat item yang lagi dipilih. Dipilih daripada
/// deretan IconButton biar gak sesak di layar sempit.
class _ActionItem {
  final String value;
  final String label;
  final IconData icon;
  final bool merah;

  const _ActionItem(this.value, this.label, this.icon, {this.merah = false});
}

class _ActionMenu extends StatelessWidget {
  final List<_ActionItem> items;
  final ValueChanged<String> onSelected;

  const _ActionMenu({required this.items, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox(width: 48);
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: PopupMenuButton<String>(
        icon: const Icon(Icons.more_vert),
        onSelected: onSelected,
        itemBuilder: (_) => [
          for (final it in items)
            PopupMenuItem(
              value: it.value,
              child: Row(
                children: [
                  Icon(it.icon, size: 18, color: it.merah ? Colors.red : Colors.black87),
                  const SizedBox(width: 10),
                  Text(it.label, style: TextStyle(color: it.merah ? Colors.red : Colors.black87)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Ringkasan jalan yang lagi dipilih: kapasitas dasar vs total kuota
/// ruas yang sudah dibagi, plus kuota event aktif kalau ada.
class _JalanSummaryCard extends StatelessWidget {
  final JalanLengkap jalan;

  const _JalanSummaryCard({required this.jalan});

  @override
  Widget build(BuildContext context) {
    final totalRuas = jalan.totalKuotaRuas;
    final overKapasitas = totalRuas > jalan.kapasitas;
    final persen = jalan.kapasitas == 0 ? 0.0 : totalRuas / jalan.kapasitas;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: kBrandColor.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kBrandColor.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${jalan.kodeJalan} - ${jalan.namaJalan}',
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: persen.clamp(0, 1),
              minHeight: 7,
              backgroundColor: const Color(0xFFE5E7EB),
              color: overKapasitas ? Colors.red : kBrandColor,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _StatKecil(
                  label: 'Kapasitas jalan',
                  value: '$totalRuas / ${jalan.kapasitas}',
                  warna: overKapasitas ? Colors.red : Colors.black87,
                ),
              ),
              if (jalan.kuotaEvent > 0)
                Expanded(
                  child: _StatKecil(
                    label: 'Kuota event aktif',
                    value: '${jalan.terisi} / ${jalan.kuotaEvent}',
                  ),
                ),
            ],
          ),
          if (overKapasitas) ...[
            const SizedBox(height: 6),
            const Text(
              'Total kuota ruas melebihi kapasitas jalan.',
              style: TextStyle(fontSize: 12, color: Colors.red, fontWeight: FontWeight.w600),
            ),
          ],
        ],
      ),
    );
  }
}

class _StatKecil extends StatelessWidget {
  final String label;
  final String value;
  final Color warna;

  const _StatKecil({required this.label, required this.value, this.warna = Colors.black87});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.black54)),
        Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: warna)),
      ],
    );
  }
}

class _RuasCard extends ConsumerWidget {
  final JalanLengkap jalan;
  final RuasLengkap ruas;

  const _RuasCard({required this.jalan, required this.ruas});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final persen = ruas.kuota == 0 ? 0.0 : ruas.terisi / ruas.kuota;
    final penuh = ruas.sisa == 0;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(ruas.namaRuas, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    const SizedBox(height: 2),
                    Text(
                      'Nomor ${ruas.nomorMulai}–${ruas.nomorSelesai}',
                      style: const TextStyle(fontSize: 12, color: Colors.black54),
                    ),
                  ],
                ),
              ),
              _StatusChip(penuh: penuh, sisa: ruas.sisa),
              PopupMenuButton<String>(
                padding: EdgeInsets.zero,
                icon: const Icon(Icons.more_vert, size: 20, color: Colors.black54),
                onSelected: (value) {
                  if (value == 'edit') _openRuasDialog(context, ref, jalan: jalan, ruas: ruas);
                  if (value == 'delete') _confirmDelete(context, ref, ruas);
                },
                itemBuilder: (_) => const [
                  PopupMenuItem(value: 'edit', child: Text('Edit')),
                  PopupMenuItem(value: 'delete', child: Text('Hapus', style: TextStyle(color: Colors.red))),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: persen.clamp(0, 1),
              minHeight: 6,
              backgroundColor: const Color(0xFFE5E7EB),
              color: penuh ? Colors.red : kBrandColor,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Kuota ${ruas.kuota} • lama ${ruas.terisiLama} • baru ${ruas.terisiBaru} • sisa ${ruas.sisa}',
            style: const TextStyle(fontSize: 12, color: Colors.black54),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final bool penuh;
  final int sisa;

  const _StatusChip({required this.penuh, required this.sisa});

  @override
  Widget build(BuildContext context) {
    final warna = penuh ? Colors.red : Colors.green.shade700;
    return Container(
      margin: const EdgeInsets.only(left: 8, top: 2),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: warna.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        penuh ? 'Penuh' : 'Sisa $sisa',
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: warna),
      ),
    );
  }
}

// ---------------------------------------------------------------- actions: kecamatan

Future<void> _openKecamatanDialog(BuildContext context, WidgetRef ref) async {
  final namaController = TextEditingController();
  final formKey = GlobalKey<FormState>();
  final notifier = ref.read(manajemenLapakProvider.notifier);

  await showDialog(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Text('Tambah Kecamatan'),
      content: Form(
        key: formKey,
        child: TextFormField(
          controller: namaController,
          decoration: const InputDecoration(labelText: 'Nama Kecamatan'),
          validator: (v) => (v == null || v.trim().isEmpty) ? 'Wajib diisi' : null,
          autofocus: true,
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Batal')),
        ElevatedButton(
          onPressed: () async {
            if (!formKey.currentState!.validate()) return;
            Navigator.pop(dialogContext);
            final ok = await notifier.createKecamatan(namaController.text.trim());
            if (!context.mounted) return;
            final error = ref.read(manajemenLapakProvider).error;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(ok ? 'Kecamatan berhasil ditambahkan.' : (error ?? 'Gagal menambah kecamatan.'))),
            );
          },
          style: ElevatedButton.styleFrom(backgroundColor: kBrandColor),
          child: const Text('Simpan', style: TextStyle(color: Colors.white)),
        ),
      ],
    ),
  );
}

Future<void> _confirmDeleteKecamatan(BuildContext context, WidgetRef ref, KecamatanLengkap kec) async {
  final id = kec.id;
  if (id == null) return;
  final confirm = await showDialog<bool>(
    context: context,
    builder: (_) => AlertDialog(
      title: const Text('Hapus Kecamatan?'),
      content: Text(
        'Kecamatan "${kec.nama}" akan dihapus permanen'
        '${kec.jalan.isNotEmpty ? ' beserta ${kec.jalan.length} jalan di dalamnya' : ''}.',
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
        TextButton(
          onPressed: () => Navigator.pop(context, true),
          child: const Text('Hapus', style: TextStyle(color: Colors.red)),
        ),
      ],
    ),
  );
  if (confirm != true) return;
  final ok = await ref.read(manajemenLapakProvider.notifier).deleteKecamatan(id);
  if (!context.mounted) return;
  final error = ref.read(manajemenLapakProvider).error;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(ok ? 'Kecamatan berhasil dihapus.' : (error ?? 'Gagal menghapus kecamatan.'))),
  );
}

// -------------------------------------------------------------- actions: jalan

Future<void> _openJalanFormDialog(
  BuildContext context,
  WidgetRef ref, {
  required String? kecamatanId,
  JalanLengkap? jalan,
}) async {
  final isEdit = jalan != null;
  final kodeController = TextEditingController(text: jalan?.kodeJalan ?? '');
  final namaController = TextEditingController(text: jalan?.namaJalan ?? '');
  final kapasitasController = TextEditingController(text: jalan?.kapasitas.toString() ?? '');
  final formKey = GlobalKey<FormState>();
  final notifier = ref.read(manajemenLapakProvider.notifier);

  await showDialog(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: Text(isEdit ? 'Edit Jalan' : 'Tambah Jalan'),
      content: Form(
        key: formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: kodeController,
                decoration: const InputDecoration(labelText: 'Kode Jalan'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Wajib diisi' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: namaController,
                decoration: const InputDecoration(labelText: 'Nama Jalan'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Wajib diisi' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: kapasitasController,
                decoration: const InputDecoration(labelText: 'Kapasitas'),
                keyboardType: TextInputType.number,
                validator: (v) {
                  final n = int.tryParse(v ?? '');
                  if (n == null || n <= 0) return 'Harus angka > 0';
                  return null;
                },
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Batal')),
        ElevatedButton(
          onPressed: () async {
            if (!formKey.currentState!.validate()) return;
            Navigator.pop(dialogContext);

            final kapasitas = int.parse(kapasitasController.text.trim());
            final ok = isEdit
                ? await notifier.updateJalan(
                    id: jalan.id,
                    kodeJalan: kodeController.text.trim(),
                    namaJalan: namaController.text.trim(),
                    kapasitas: kapasitas,
                  )
                : await notifier.createJalan(
                    kecamatanId: kecamatanId!,
                    kodeJalan: kodeController.text.trim(),
                    namaJalan: namaController.text.trim(),
                    kapasitas: kapasitas,
                  );
            if (!context.mounted) return;
            final error = ref.read(manajemenLapakProvider).error;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  ok
                      ? (isEdit ? 'Jalan berhasil diubah.' : 'Jalan berhasil ditambahkan.')
                      : (error ?? 'Gagal menyimpan jalan.'),
                ),
              ),
            );
          },
          style: ElevatedButton.styleFrom(backgroundColor: kBrandColor),
          child: const Text('Simpan', style: TextStyle(color: Colors.white)),
        ),
      ],
    ),
  );
}

Future<void> _confirmDeleteJalan(BuildContext context, WidgetRef ref, JalanLengkap jalan) async {
  final confirm = await showDialog<bool>(
    context: context,
    builder: (_) => AlertDialog(
      title: const Text('Hapus Jalan?'),
      content: Text(
        'Jalan "${jalan.namaJalan}" akan dihapus permanen'
        '${jalan.ruas.isNotEmpty ? ' beserta ${jalan.ruas.length} ruas di dalamnya' : ''}.',
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
        TextButton(
          onPressed: () => Navigator.pop(context, true),
          child: const Text('Hapus', style: TextStyle(color: Colors.red)),
        ),
      ],
    ),
  );
  if (confirm != true) return;
  final ok = await ref.read(manajemenLapakProvider.notifier).deleteJalan(jalan.id);
  if (!context.mounted) return;
  final error = ref.read(manajemenLapakProvider).error;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(ok ? 'Jalan berhasil dihapus.' : (error ?? 'Gagal menghapus jalan.'))),
  );
}

// ---------------------------------------------------------------- actions: ruas

Future<void> _confirmDelete(BuildContext context, WidgetRef ref, RuasLengkap ruas) async {
  final confirm = await showDialog<bool>(
    context: context,
    builder: (_) => AlertDialog(
      title: const Text('Hapus Ruas?'),
      content: Text('Ruas "${ruas.namaRuas}" akan dihapus permanen.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
        TextButton(
          onPressed: () => Navigator.pop(context, true),
          child: const Text('Hapus', style: TextStyle(color: Colors.red)),
        ),
      ],
    ),
  );
  if (confirm != true) return;
  final ok = await ref.read(manajemenLapakProvider.notifier).deleteRuas(ruas.id);
  if (!context.mounted) return;
  final error = ref.read(manajemenLapakProvider).error;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(ok ? 'Ruas berhasil dihapus.' : (error ?? 'Gagal menghapus ruas.'))),
  );
}

Future<void> _openRuasDialog(
  BuildContext context,
  WidgetRef ref, {
  required JalanLengkap jalan,
  RuasLengkap? ruas,
}) async {
  final isEdit = ruas != null;
  final namaController = TextEditingController(text: ruas?.namaRuas ?? '');
  final kuotaController = TextEditingController(text: ruas?.kuota.toString() ?? '');
  final formKey = GlobalKey<FormState>();
  final notifier = ref.read(manajemenLapakProvider.notifier);

  await showDialog(
    context: context,
    builder: (dialogContext) {
      return AlertDialog(
        title: Text(isEdit ? 'Edit Ruas' : 'Tambah Ruas — ${jalan.namaJalan}'),
        content: Form(
          key: formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: namaController,
                  decoration: const InputDecoration(labelText: 'Nama Ruas'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Wajib diisi' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: kuotaController,
                  decoration: const InputDecoration(labelText: 'Kuota'),
                  keyboardType: TextInputType.number,
                  validator: (v) {
                    final n = int.tryParse(v ?? '');
                    if (n == null || n <= 0) return 'Harus angka > 0';
                    return null;
                  },
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) return;
              Navigator.pop(dialogContext);

              final kuota = int.parse(kuotaController.text.trim());
              final ok = isEdit
                  ? await notifier.updateRuas(
                      id: ruas.id,
                      namaRuas: namaController.text.trim(),
                      kuota: kuota,
                    )
                  : await notifier.createRuas(
                      jalanId: jalan.id,
                      namaRuas: namaController.text.trim(),
                      kuota: kuota,
                    );
              if (!context.mounted) return;
              final error = ref.read(manajemenLapakProvider).error;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    ok
                        ? (isEdit ? 'Ruas berhasil diubah.' : 'Ruas berhasil ditambahkan.')
                        : (error ?? 'Gagal menyimpan ruas.'),
                  ),
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: kBrandColor),
            child: const Text('Simpan', style: TextStyle(color: Colors.white)),
          ),
        ],
      );
    },
  );
}