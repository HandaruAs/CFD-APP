// features/pedagang/presentation/pages/pedagang_dashboard.dart

import 'package:flutter/material.dart';
import 'package:mobile/features/pedagang/data/datasources/pedagang_remote_datasource.dart'; // ✅ Perbaikan
import 'package:mobile/features/pedagang/data/models/dashboard_model.dart';
import 'package:mobile/core/widgets/layouts/main_layout.dart'; // ✅ Perbaikan

class PedagangDashboard extends StatefulWidget {
  const PedagangDashboard({super.key});

  @override
  State<PedagangDashboard> createState() => _PedagangDashboardState();
}

class _PedagangDashboardState extends State<PedagangDashboard> {
  late Future<PedagangDashboardData> _dashboardDataFuture;

  @override
  void initState() {
    super.initState();
    _dashboardDataFuture = PedagangRemoteDatasource.fetchPedagangDashboard(); // ✅ Perbaikan
  }

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      title: 'Dashboard Pedagang',
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: FutureBuilder<PedagangDashboardData>(
          future: _dashboardDataFuture,
          builder: (context, snapshot) {
            // 1. Loading State
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }

            // 2. Error State
            if (snapshot.hasError) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red, size: 48),
                    const SizedBox(height: 16),
                    const Text("Gagal memuat data dashboard", style: TextStyle(fontSize: 16)),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () {
                        setState(() {
                          _dashboardDataFuture = PedagangRemoteDatasource.fetchPedagangDashboard();
                        });
                      },
                      child: const Text("Coba Lagi"),
                    ),
                  ],
                ),
              );
            }

            // 3. Success State
            final data = snapshot.data!;
            return SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Header Ringkasan
                  Card(
                    elevation: 4,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: Padding(
                      padding: const EdgeInsets.all(20.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Ringkasan Pengajuan Usaha",
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _buildSummaryItem("Total", data.totalPengajuan, Colors.blue),
                              _buildSummaryItem("Pending", data.pengajuanPending, Colors.orange),
                              _buildSummaryItem("Diterima", data.pengajuanDiterima, Colors.green),
                              _buildSummaryItem("Ditolak", data.pengajuanDitolak, Colors.red),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // 2. Status Terakhir
                  Card(
                    elevation: 4,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Status Pengajuan Terakhir",
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: _getStatusColor(data.statusPengajuanTerakhir).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: _getStatusColor(data.statusPengajuanTerakhir)),
                            ),
                            child: Text(
                              data.statusPengajuanTerakhir,
                              style: TextStyle(
                                color: _getStatusColor(data.statusPengajuanTerakhir),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          )
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  // Widget helper untuk menampilkan kartu angka kecil
  Widget _buildSummaryItem(String label, int count, Color color) {
    return Column(
      children: [
        Text(
          count.toString(),
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Colors.grey),
        ),
      ],
    );
  }

  // Fungsi helper untuk warna status
  Color _getStatusColor(String status) {
    if (status.contains("Diterima")) return Colors.green;
    if (status.contains("Ditolak")) return Colors.red;
    if (status.contains("Pending") || status.contains("Diproses")) return Colors.orange;
    return Colors.grey;
  }
}