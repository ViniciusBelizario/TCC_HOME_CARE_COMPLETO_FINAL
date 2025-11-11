import 'package:flutter/material.dart';
import '../core/colors.dart';
import '../core/auth_store.dart';
import '../services/profile_service.dart';

class PerfilScreen extends StatefulWidget {
  const PerfilScreen({super.key});

  @override
  State<PerfilScreen> createState() => _PerfilScreenState();
}

class _PerfilScreenState extends State<PerfilScreen> {
  final _svc = ProfileService();
  Me? _me;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final me = await _svc.me();
      if (!mounted) return;
      setState(() => _me = me);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro ao carregar perfil: $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _maskCpf(String cpf) {
    if (cpf.length != 11) return cpf;
    return '${cpf.substring(0, 3)}.${cpf.substring(3, 6)}.${cpf.substring(6, 9)}-${cpf.substring(9)}';
    // 222.222.222-22
  }

  String _fmtPhone(String? p) {
    if (p == null || p.isEmpty) return '-';
    // tenta (11) 99999-9999
    final digits = p.replaceAll(RegExp(r'\D'), '');
    if (digits.length == 11) {
      return '(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}';
    }
    if (digits.length == 10) {
      return '(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}';
    }
    return p;
  }

  Widget _tile(String title, String value) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE0E6F0)),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow,
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  color: Color(0xFF6E84A3), fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(value,
              style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.blackText)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final me = _me;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Meu Perfil', style: TextStyle(color: AppColors.blackText)),
        centerTitle: true,
        elevation: 0,
        backgroundColor: AppColors.lightBlue,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.blackText),
          onPressed: () => Navigator.pushReplacementNamed(context, '/home'),
        ),
        actions: [
          IconButton(
            onPressed: _load,
            icon: const Icon(Icons.refresh, color: AppColors.blackText),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Cabeçalho
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.shadow,
                            blurRadius: 10,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          const CircleAvatar(
                            radius: 28,
                            backgroundColor: Color(0xFFE8F0FF),
                            child: Icon(Icons.person, size: 34, color: AppColors.blue),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(me?.name ?? '-',
                                    style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.blackText)),
                                const SizedBox(height: 4),
                                Text(me?.email ?? '-',
                                    style: const TextStyle(color: Color(0xFF556987))),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Dados pessoais
                    _tile('CPF', me != null ? _maskCpf(me.cpf) : '-'),
                    _tile('Telefone', _fmtPhone(me?.patientProfile?.phone)),
                    _tile('Endereço', me?.patientProfile?.address?.trim().isNotEmpty == true
                        ? me!.patientProfile!.address!
                        : '-'),
                    _tile('Papel', me?.role == 'PACIENTE' ? 'Paciente' : (me?.role ?? '-')),
                    if (me?.createdAt != null)
                      _tile('Cadastrado em',
                          '${me!.createdAt!.day.toString().padLeft(2, '0')}/'
                          '${me.createdAt!.month.toString().padLeft(2, '0')}/'
                          '${me.createdAt!.year}'),
                    const SizedBox(height: 8),

                    // Botões de ação
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.blue),
                        onPressed: () async {
                          await AuthStore.I.logout();
                          if (!mounted) return;
                          Navigator.pushNamedAndRemoveUntil(context, '/login', (_) => false);
                        },
                        icon: const Icon(Icons.logout, color: Colors.white),
                        label: const Text('Sair',
                            style: TextStyle(
                                color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
