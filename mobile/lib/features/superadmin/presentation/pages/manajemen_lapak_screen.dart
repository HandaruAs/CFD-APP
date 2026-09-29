import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
          Container(
            margin: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: kBrandColor.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(14),
            ),
            child: TabBar(
              dividerColor: Colors.transparent,
              indicatorSize: TabBarIndicatorSize.tab,
              indicator: BoxDecoration(
                color: kBrandColor,
                borderRadius: BorderRadius.circular(11),
              ),
              labelColor: Colors.white,
              unselectedLabelColor: kBrandColor,
              labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
              tabs: const [
                Tab(height: 40, text: 'Ruas & Kuota'),
                Tab(height: 40, text: 'Laporan'),
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
        _SectionLabel(
          'Kecamatan',
          trailing: state.kecamatanBisaDihapus && state.kecamatanDipilih != null
              ? TextButton.icon(
                  onPressed: () => _confirmDeleteKecamatan(context, ref, state.kecamatanDipilih!),
                  icon: const Icon(Icons.delete_outline_rounded, size: 16),
                  label: const Text('Hapus'),
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.red,
                    visualDensity: VisualDensity.compact,
                  ),
                )
              : null,
        ),
        _ChipRow(children: [
          for (final e in state.kecamatanOpsi)
            _SelectChip(
              label: e.value.nama,
              selected: e.key == state.kecamatanKey,
              onTap: () => notifier.setKecamatan(e.key),
            ),
          _AddChip(label: 'Kecamatan', onTap: () => _openKecamatanDialog(context, ref)),
        ]),
        const SizedBox(height: 14),
        const _SectionLabel('Jalan'),
        _ChipRow(children: [
          for (final j in state.jalanOpsi)
            _SelectChip(
              label: '${j.kodeJalan} · ${j.namaJalan}',
              selected: j.id == state.jalanId,
              onTap: () => notifier.setJalan(j.id),
            ),
          if (state.bisaTambahJalan)
            _AddChip(
              label: 'Jalan',
              onTap: () {
                final kecId = state.kecamatanDipilih?.id;
                if (kecId != null) _openJalanFormDialog(context, ref, kecamatanId: kecId);
              },
            ),
        ]),
        if (state.jalanOpsi.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 6),
            child: Text('Kecamatan ini belum punya jalan',
                style: TextStyle(fontSize: 12.5, color: Colors.black54)),
          ),
        const SizedBox(height: 16),
        if (jalan != null) ...[
          _JalanSummaryCard(
            jalan: jalan,
            onEdit: () => _openJalanFormDialog(context, ref, kecamatanId: null, jalan: jalan),
            onDelete: () => _confirmDeleteJalan(context, ref, jalan),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              const Text('Daftar Ruas', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: kBrandColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text('${jalan.ruas.length}',
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w700, color: kBrandColor)),
              ),
              const Spacer(),
              FilledButton.tonalIcon(
                onPressed: () => _openRuasDialog(context, ref, jalan: jalan),
                icon: const Icon(Icons.add_rounded, size: 18),
                label: const Text('Tambah'),
                style: FilledButton.styleFrom(
                  foregroundColor: kBrandColor,
                  backgroundColor: kBrandColor.withValues(alpha: 0.10),
                  visualDensity: VisualDensity.compact,
                ),
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

class _SectionLabel extends StatelessWidget {
  final String text;
  final Widget? trailing;
  const _SectionLabel(this.text, {this.trailing});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 36,
      child: Row(
        children: [
          Text(text,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.black54)),
          const Spacer(),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

/// Baris chip yang bisa digeser horizontal (tinggi 48 = area sentuh nyaman).
class _ChipRow extends StatelessWidget {
  final List<Widget> children;
  const _ChipRow({required this.children});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 48,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: children.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) => Center(child: children[i]),
      ),
    );
  }
}

class _SelectChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _SelectChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? kBrandColor : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: selected ? kBrandColor : kBrandColor.withValues(alpha: 0.15)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: Container(
          height: 44,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          alignment: Alignment.center,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (selected) ...[
                const Icon(Icons.check_rounded, size: 16, color: Colors.white),
                const SizedBox(width: 6),
              ],
              Text(label,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: selected ? Colors.white : kBrandColor,
                  )),
            ],
          ),
        ),
      ),
    );
  }
}

class _AddChip extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _AddChip({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: kBrandColor.withValues(alpha: 0.08),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: kBrandColor.withValues(alpha: 0.35)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          height: 44,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          alignment: Alignment.center,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.add_rounded, size: 18, color: kBrandColor),
              const SizedBox(width: 4),
              Text(label,
                  style: const TextStyle(
                      fontSize: 13.5, fontWeight: FontWeight.w700, color: kBrandColor)),
            ],
          ),
        ),
      ),
    );
  }
}

/// Ringkasan jalan yang lagi dipilih: kapasitas dasar vs total kuota
/// ruas yang sudah dibagi, plus kuota event aktif kalau ada.
class _JalanSummaryCard extends StatelessWidget {
  final JalanLengkap jalan;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _JalanSummaryCard({required this.jalan, required this.onEdit, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final totalRuas = jalan.totalKuotaRuas;
    final over = totalRuas > jalan.kapasitas;
    final persen = jalan.kapasitas == 0 ? 0.0 : totalRuas / jalan.kapasitas;
    final warna = over ? const Color(0xFFB91C1C) : kBrandColor;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: over ? [const Color(0xFFB91C1C), const Color(0xFFDC2626)] : [kBrandColor, kBrandColorLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: warna.withValues(alpha: 0.25), blurRadius: 18, offset: const Offset(0, 8))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text('${jalan.kodeJalan} - ${jalan.namaJalan}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
              ),
              IconButton(
                tooltip: 'Edit jalan',
                onPressed: onEdit,
                icon: const Icon(Icons.edit_outlined, size: 20, color: Colors.white),
                visualDensity: VisualDensity.compact,
              ),
              IconButton(
                tooltip: 'Hapus jalan',
                onPressed: onDelete,
                icon: const Icon(Icons.delete_outline_rounded, size: 20, color: Colors.white),
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('$totalRuas',
                  style: const TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.w800, height: 1)),
              Text(' / ${jalan.kapasitas}',
                  style: const TextStyle(color: Colors.white70, fontSize: 16, fontWeight: FontWeight.w600)),
              const Spacer(),
              Text('${(persen * 100).round()}%',
                  style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 4),
          const Text('Kapasitas jalan terbagi ke ruas',
              style: TextStyle(color: Colors.white70, fontSize: 12)),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: persen.clamp(0, 1),
              minHeight: 8,
              backgroundColor: Colors.white.withValues(alpha: 0.25),
              color: Colors.white,
            ),
          ),
          if (jalan.kuotaEvent > 0) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text('Kuota event aktif  ${jalan.terisi} / ${jalan.kuotaEvent}',
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
            ),
          ],
          if (over) ...[
            const SizedBox(height: 10),
            const Row(
              children: [
                Icon(Icons.warning_amber_rounded, color: Colors.white, size: 16),
                SizedBox(width: 6),
                Expanded(
                  child: Text('Total kuota ruas melebihi kapasitas jalan.',
                      style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
          ],
        ],
      ),
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
    final warna = penuh ? const Color(0xFFDC2626) : kBrandColor;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => _showRuasSheet(context, ref, jalan, ruas),
      child: Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [BoxShadow(color: kBrandColor.withValues(alpha: 0.06), blurRadius: 16, offset: const Offset(0, 6))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: kBrandColor.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.signpost_rounded, color: kBrandColor, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(ruas.namaRuas, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                    const SizedBox(height: 2),
                    Text('Nomor ${ruas.nomorMulai}–${ruas.nomorSelesai}',
                        style: const TextStyle(fontSize: 12.5, color: Colors.black54)),
                  ],
                ),
              ),
              _StatusChip(penuh: penuh, sisa: ruas.sisa),
              IconButton(
                onPressed: () => _showRuasSheet(context, ref, jalan, ruas),
                icon: const Icon(Icons.more_horiz_rounded, color: Colors.black54),
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: persen.clamp(0, 1),
              minHeight: 8,
              backgroundColor: kBrandColor.withValues(alpha: 0.08),
              color: warna,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _MiniStat('Kuota', ruas.kuota),
              _MiniStat('Lama', ruas.terisiLama),
              _MiniStat('Baru', ruas.terisiBaru),
              _MiniStat('Sisa', ruas.sisa, warna: penuh ? Colors.red : const Color(0xFF15803D)),
            ],
          ),
        ],
      ),
      ),
    );
  }
}

Future<void> _showRuasSheet(BuildContext context, WidgetRef ref, JalanLengkap jalan, RuasLengkap ruas) {
  return showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(ruas.namaRuas,
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.edit_outlined),
            title: const Text('Edit Ruas'),
            onTap: () {
              Navigator.pop(ctx);
              _openRuasDialog(context, ref, jalan: jalan, ruas: ruas);
            },
          ),
          ListTile(
            leading: const Icon(Icons.delete_outline_rounded, color: Colors.red),
            title: const Text('Hapus Ruas', style: TextStyle(color: Colors.red)),
            onTap: () {
              Navigator.pop(ctx);
              _confirmDelete(context, ref, ruas);
            },
          ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );
}

class _MiniStat extends StatelessWidget {
  final String label;
  final int value;
  final Color? warna;

  const _MiniStat(this.label, this.value, {this.warna});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text('$value', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: warna)),
          const SizedBox(height: 1),
          Text(label, style: const TextStyle(fontSize: 11.5, color: Colors.black54)),
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
      margin: const EdgeInsets.only(left: 8),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: warna.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
      child: Text(penuh ? 'Penuh' : 'Sisa $sisa',
          style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: warna)),
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