import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/colors.dart';
import '../widgets/consulta_card.dart';
import '../widgets/info_card.dart';
import '../widgets/big_button.dart';
import '../widgets/custom_bottom_nav.dart';
import '../services/appointments_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 1;
  final _svc = AppointmentsService();
  List<AppointmentItem> _consultas = [];
  bool _loading = true;

  // formatadores
  final _fmtData = DateFormat('dd/MM');
  final _fmtHora = DateFormat('HH:mm');

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final list = await _svc.my();
      setState(() => _consultas = list);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao carregar consultas: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openWizard() async {
    final result = await Navigator.pushNamed(context, '/novo-servico');
    if (result is bool && result == true) {
      await _load(); // recarrega após agendar
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Agendamento enviado!')),
      );
    }
  }

  void _handleNavTap(int index) {
    if (index == 1) {
      _openWizard();
      return;
    }
    if (index == 0) {
      Navigator.pushReplacementNamed(context, '/perfil');
    } else if (index == 2) {
      Navigator.pushReplacementNamed(context, '/agenda');
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
        backgroundColor: AppColors.lightBlue,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          "Home Care",
          style: TextStyle(
            fontSize: 22,
            color: AppColors.blackText,
            fontWeight: FontWeight.bold,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.refresh, color: AppColors.blackText),
          onPressed: _load,
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 12),
                    const Text(
                      "Próximas Consultas",
                      style: TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.bold,
                        color: AppColors.blackText,
                      ),
                    ),
                    const SizedBox(height: 10),
                    for (final c in _consultas)
                      ConsultaCard(
                        data: _fmtData.format(c.startsAt),
                        titulo: c.doctorName.isNotEmpty
                            ? "Consulta com ${c.doctorName}"
                            : "Consulta",
                        subtitulo: (c.notes ?? '').isEmpty ? " " : c.notes!,
                        hora: _fmtHora.format(c.startsAt),
                      ),
                    const SizedBox(height: 18),
                    const Text(
                      "Resultados de Exames",
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                        color: AppColors.blackText,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Row(
                      children: [
                        InfoCard(
                          titulo: "Resultados de Exames",
                          subtitulo: "Disponíveis",
                          selected: true,
                        ),
                        InfoCard(
                          titulo: "Serviços Marcados",
                          subtitulo: "Ver agenda",
                        ),
                      ],
                    ),
                    const InfoCard(
                      titulo: "Histórico Médico",
                      subtitulo: "Disponível",
                    ),
                    const SizedBox(height: 16),
                    BigButton(
                      text: "Solicitar atendimento domiciliar",
                      onPressed: _openWizard,
                    ),
                    const SizedBox(height: 28),
                  ],
                ),
              ),
      ),
      bottomNavigationBar: CustomBottomNav(
        selectedIndex: _selectedIndex,
        onTap: _handleNavTap,
      ),
    );
  }
}
