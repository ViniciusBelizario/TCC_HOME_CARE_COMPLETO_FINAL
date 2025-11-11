import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/colors.dart';
import '../widgets/custom_bottom_nav.dart';
import 'home_screen.dart';
import '../services/appointments_service.dart';

class AgendaScreen extends StatefulWidget {
  const AgendaScreen({super.key});
  @override
  State<AgendaScreen> createState() => _AgendaScreenState();
}

class _AgendaScreenState extends State<AgendaScreen> {
  int _selectedIndex = 2;
  final _svc = AppointmentsService();
  List<AppointmentItem> _itens = [];
  bool _loading = true;

  // formatadores (usam fuso do aparelho)
  final _fmtData = DateFormat('dd/MM');
  final _fmtHora = DateFormat('HH:mm');

  String statusText(ApptStatus s) {
    switch (s) {
      case ApptStatus.pending:
        return 'Pendente';
      case ApptStatus.confirmed:
        return 'Confirmado';
      case ApptStatus.completed:
        return 'Concluído';
      case ApptStatus.cancelled:
        return 'Cancelado';
    }
  }

  Color statusColor(ApptStatus s) {
    switch (s) {
      case ApptStatus.pending:
        return const Color(0xFF6E84A3);
      case ApptStatus.confirmed:
        return AppColors.blue;
      case ApptStatus.completed:
        return const Color(0xFF2E7D32);
      case ApptStatus.cancelled:
        return const Color(0xFFD32F2F);
    }
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final list = await _svc.my();
      setState(() => _itens = list);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro ao carregar agenda: $e')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _handleNavTap(int index) {
    if (index == 1) {
      Navigator.pushNamed(context, '/novo-servico');
      return;
    }
    if (index == 0) {
      Navigator.pushReplacementNamed(context, '/perfil');
    } else if (index == 2) {
      // já aqui
    } else {
      setState(() => _selectedIndex = index);
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Minha Agenda',
            style: TextStyle(color: AppColors.blackText)),
        backgroundColor: AppColors.lightBlue,
        centerTitle: true,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.blackText),
          onPressed: () {
            Navigator.pushReplacement(
                context, MaterialPageRoute(builder: (_) => const HomeScreen()));
          },
        ),
        actions: [
          IconButton(
            onPressed: _load,
            icon: const Icon(Icons.refresh, color: AppColors.blackText),
          )
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _itens.length,
              itemBuilder: (_, i) {
                final a = _itens[i];
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.06),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("${_fmtData.format(a.startsAt)} às ${_fmtHora.format(a.startsAt)}",
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      Text(
                          "Consulta com ${a.doctorName.isNotEmpty ? a.doctorName : 'Médico'}",
                          style: const TextStyle(fontSize: 16)),
                      if ((a.notes ?? '').isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(a.notes!,
                            style: const TextStyle(
                                fontSize: 13, color: Color(0xFF697A98))),
                      ],
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: statusColor(a.status).withOpacity(0.15),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              statusText(a.status),
                              style: TextStyle(
                                  color: statusColor(a.status),
                                  fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
      bottomNavigationBar: CustomBottomNav(
        selectedIndex: _selectedIndex,
        onTap: _handleNavTap,
      ),
    );
  }
}
