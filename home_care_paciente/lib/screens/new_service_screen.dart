import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/colors.dart';
import '../services/doctors_service.dart';
import '../services/availability_service.dart';
import '../services/appointments_service.dart';
import '../services/exams_service.dart';

class NewServiceScreen extends StatefulWidget {
  const NewServiceScreen({super.key});

  @override
  State<NewServiceScreen> createState() => _NewServiceScreenState();
}

class _NewServiceScreenState extends State<NewServiceScreen> {
  int _step = 1;

  // dados do agendamento
  String? _service; // etapa 1
  int? _doctorId; // etapa 2
  DateTime? _selectedDate; // etapa 2
  int? _selectedSlotId; // etapa 2
  String? _filePath; // etapa 3
  bool _useOtherAddress = false; // etapa 4
  final _otherAddressCtrl = TextEditingController();

  final String _defaultAddress =
      "Rua Exemplo, 456   Bairro Central\nBelo Horizonte, MG, 30123-456";

  final _doctorsSvc = DoctorsService();
  final _availSvc = AvailabilityService();
  final _apptSvc = AppointmentsService();
  final _examsSvc = ExamsService();

  List<Doctor> _doctors = [];
  List<Slot> _slots = [];
  bool _loadingDoctors = true;
  bool _loadingSlots = false;

  // formatador de hora (usa fuso do aparelho)
  final _fmtHora = DateFormat('HH:mm');

  @override
  void initState() {
    super.initState();
    _loadDoctors();
  }

  @override
  void dispose() {
    _otherAddressCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadDoctors() async {
    setState(() => _loadingDoctors = true);
    try {
      _doctors = await _doctorsSvc.list();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro ao listar médicos: $e')));
      }
    } finally {
      if (mounted) setState(() => _loadingDoctors = false);
    }
  }

  Future<void> _loadSlots() async {
    if (_doctorId == null) return;
    setState(() {
      _loadingSlots = true;
      _slots = [];
      _selectedSlotId = null;
      _selectedDate = null;
    });
    try {
      final now = DateTime.now();
      final from = DateTime(now.year, now.month, now.day);
      final to = from.add(const Duration(days: 14));
      _slots = await _availSvc.list(doctorId: _doctorId!, from: from, to: to);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Erro ao carregar horários: $e')));
      }
    } finally {
      if (mounted) setState(() => _loadingSlots = false);
    }
  }

  // util
  String _ddmes(DateTime d) {
    const meses = [
      "janeiro",
      "fevereiro",
      "março",
      "abril",
      "maio",
      "junho",
      "julho",
      "agosto",
      "setembro",
      "outubro",
      "novembro",
      "dezembro"
    ];
    return "${d.day} de ${meses[d.month - 1]} de ${d.year}";
  }

  List<DateTime> get _nextFiveDays {
    final now = DateTime.now();
    return List.generate(5, (i) => DateTime(now.year, now.month, now.day + i));
    // ^ datas já locais
  }

  // slots por dia
  List<Slot> _slotsOfDay(DateTime day) {
    return _slots
        .where((s) =>
            s.startsAt.year == day.year &&
            s.startsAt.month == day.month &&
            s.startsAt.day == day.day)
        .toList();
  }

  void _warn(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  // navegação entre passos
  void _next() {
    if (_step == 1 && _service == null) {
      _warn("Selecione uma necessidade.");
      return;
    }
    if (_step == 2 &&
        (_doctorId == null ||
            _selectedSlotId == null ||
            _selectedDate == null)) {
      _warn("Selecione o médico e um horário.");
      return;
    }
    if (_step == 4 &&
        _useOtherAddress &&
        _otherAddressCtrl.text.trim().isEmpty) {
      _warn("Informe o endereço ou desmarque a opção.");
      return;
    }
    setState(() => _step = (_step < 5) ? _step + 1 : 5);
  }

  void _back() {
    if (_step == 1) {
      Navigator.pop(context);
    } else {
      setState(() => _step--);
    }
  }

  // concluir → cria consulta (PENDING) e faz upload (opcional)
  Future<void> _confirm() async {
    try {
      final String address =
          _useOtherAddress && _otherAddressCtrl.text.trim().isNotEmpty
              ? _otherAddressCtrl.text.trim()
              : _defaultAddress;

      final notes = [
        if (_service != null) "Serviço: $_service",
        "Endereço: $address",
      ].join("\n");

      await _apptSvc.create(slotId: _selectedSlotId!, notes: notes);

      if (_filePath != null && _filePath!.isNotEmpty) {
        await _examsSvc.upload(
          file: File(_filePath!),
          description: "Anexo do agendamento",
        );
      }

      if (!mounted) return;
      Navigator.pop(context, true); // sucesso
    } catch (e) {
      _warn("Falha ao agendar: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.lightBlue,
        elevation: 0,
        leading:
            IconButton(icon: const Icon(Icons.arrow_back), onPressed: _back),
        centerTitle: true,
        title: Text("Etapa $_step de 5",
            style: const TextStyle(
                color: AppColors.blackText, fontWeight: FontWeight.w600)),
      ),
      body: Padding(padding: const EdgeInsets.all(16), child: _buildStep()),
    );
  }

  // ------------ UI dos passos ----------------
  Widget _buildStep() {
    switch (_step) {
      case 1:
        return _step1();
      case 2:
        return _step2();
      case 3:
        return _step3();
      case 4:
        return _step4();
      case 5:
        return _step5();
      default:
        return const SizedBox.shrink();
    }
  }

  // Etapa 1 - Ver a necessidade
  Widget _step1() {
    final options = [
      "Recolhimento de sangue",
      "Curativo",
      "Aplicar medicação",
      "Fisioterapia",
      "Outro"
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 12),
        const Text("Ver a necessidade",
            style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: AppColors.blackText)),
        const SizedBox(height: 8),
        const Text("Qual é a necessidade da consulta?",
            style: TextStyle(fontSize: 15, color: Color(0xFF556987))),
        const SizedBox(height: 16),
        ...options.map((o) => _radioTile(
            title: o,
            selected: _service == o,
            onTap: () => setState(() => _service = o))),
        const Spacer(),
        _primaryButton(label: "Próximo", onPressed: _next),
      ],
    );
  }

  Widget _radioTile(
      {required String title,
      required bool selected,
      required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: selected ? AppColors.blue : const Color(0xFFE0E6F0),
              width: 1.4),
        ),
        child: Row(
          children: [
            Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off,
                color: selected ? AppColors.blue : const Color(0xFF90A0BF)),
            const SizedBox(width: 12),
            Expanded(
                child: Text(title,
                    style: const TextStyle(
                        fontSize: 16,
                        color: AppColors.blackText,
                        fontWeight: FontWeight.w500))),
          ],
        ),
      ),
    );
  }

  // Etapa 2 - Escolher médico e horário (slots reais da API)
  Widget _step2() {
    final days = _nextFiveDays;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        const Text("Agendamento de Horário",
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
        const SizedBox(height: 6),
        const Text("Selecione o médico, a data e horário disponíveis",
            style: TextStyle(fontSize: 15, color: Color(0xFF556987))),
        const SizedBox(height: 12),

        // Médicos
        _loadingDoctors
            ? const Center(child: CircularProgressIndicator())
            : DropdownButtonFormField<int>(
                value: _doctorId,
                items: _doctors
                    .map((d) =>
                        DropdownMenuItem(value: d.id, child: Text(d.name)))
                    .toList(),
                onChanged: (v) async {
                  setState(() {
                    _doctorId = v;
                  });
                  await _loadSlots();
                },
                decoration: const InputDecoration(labelText: "Médico"),
              ),

        const SizedBox(height: 16),
        const Text("Datas", style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),

        SizedBox(
          height: 82,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: days.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (_, i) {
              final d = days[i];
              final isSel = _selectedDate != null &&
                  _selectedDate!.year == d.year &&
                  _selectedDate!.month == d.month &&
                  _selectedDate!.day == d.day;
              return _dateCell(
                  d, isSel, () => setState(() => _selectedDate = d));
            },
          ),
        ),

        const SizedBox(height: 16),
        const Text("Horários disponíveis",
            style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 10),

        if (_loadingSlots)
          const Center(child: CircularProgressIndicator())
        else
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: _selectedDate == null
                ? [const Text("Selecione uma data acima.")]
                : _slotsOfDay(_selectedDate!).isEmpty
                    ? [const Text("Sem horários para este dia.")]
                    : _slotsOfDay(_selectedDate!).map((s) {
                        final sel = _selectedSlotId == s.id;
                        final label = _fmtHora.format(s.startsAt); // <- aqui
                        return GestureDetector(
                          onTap: () => setState(() => _selectedSlotId = s.id),
                          child: Container(
                            width: 88,
                            height: 44,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: sel ? AppColors.blue : Colors.white,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                  color: sel
                                      ? AppColors.blue
                                      : const Color(0xFFE0E6F0)),
                            ),
                            child: Text(label,
                                style: TextStyle(
                                    color: sel
                                        ? Colors.white
                                        : AppColors.blackText,
                                    fontWeight: FontWeight.w600)),
                          ),
                        );
                      }).toList(),
          ),

        const Spacer(),
        _primaryButton(label: "Continuar", onPressed: _next),
      ],
    );
  }

  Widget _dateCell(DateTime d, bool selected, VoidCallback onTap) {
    const dias = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
    final abbr = dias[(d.weekday - 1) % 7];
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 76,
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppColors.blue : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: selected ? AppColors.blue : const Color(0xFFE0E6F0),
              width: 1.4),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(abbr,
                style: TextStyle(
                    color: selected ? Colors.white70 : const Color(0xFF6E84A3),
                    fontSize: 12,
                    fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text("${d.day.toString().padLeft(2, '0')}",
                style: TextStyle(
                    color: selected ? Colors.white : AppColors.blackText,
                    fontSize: 20,
                    fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  // Etapa 3 - Upload de Arquivo (opcional)
  Widget _step3() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        const Text("UPLOAD DE ARQUIVO",
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
        const SizedBox(height: 6),
        const Text(
            "Envie exames, encaminhamento, ou outro documento (opcional).",
            style: TextStyle(fontSize: 15, color: Color(0xFF556987))),
        const SizedBox(height: 18),
        GestureDetector(
          onTap: () async {
            final res = await FilePicker.platform.pickFiles(withData: false);
            if (res != null && res.files.isNotEmpty) {
              setState(() => _filePath = res.files.single.path);
            }
          },
          child: Container(
            height: 140,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE0E6F0), width: 1.6),
            ),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.upload_file,
                      size: 36, color: AppColors.blue),
                  const SizedBox(height: 8),
                  Text(
                    _filePath == null
                        ? "Selecionar arquivo"
                        : "Selecionado: ${_filePath!.split(Platform.pathSeparator).last}",
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ),
        ),
        const Spacer(),
        _primaryButton(label: "Próximo", onPressed: _next),
      ],
    );
  }

  // Etapa 4 - Confirmar Endereço
  Widget _step4() {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 8),
          const Text("Confirme o endereço",
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          const Text("A consulta será realizada no endereço abaixo?",
              style: TextStyle(fontSize: 15, color: Color(0xFF556987))),
          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE0E6F0))),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Paciente",
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                SizedBox(height: 6),
                Text("Endereço principal:"),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE0E6F0))),
            child: Text(_defaultAddress),
          ),
          const SizedBox(height: 12),
          SwitchListTile.adaptive(
            value: _useOtherAddress,
            onChanged: (v) => setState(() => _useOtherAddress = v),
            title: const Text("Deseja informar outro endereço?"),
            contentPadding: EdgeInsets.zero,
          ),
          if (_useOtherAddress)
            TextField(
              controller: _otherAddressCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                  labelText: "Novo endereço",
                  hintText: "Rua, número, bairro, cidade/UF, CEP"),
            ),
          const SizedBox(height: 18),
          _primaryButton(label: "Próximo", onPressed: _next),
        ],
      ),
    );
  }

  // Etapa 5 - Confirmar Agendamento
  Widget _step5() {
    final s = _slots.firstWhere((x) => x.id == _selectedSlotId);
    final DateTime d = s.startsAt;
    final horario = _fmtHora.format(d);
    final addr = _useOtherAddress && _otherAddressCtrl.text.trim().isNotEmpty
        ? _otherAddressCtrl.text.trim()
        : _defaultAddress;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 8),
        const Text("CONFIRMAR AGENDAMENTO",
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
        const SizedBox(height: 14),
        _summaryTile("Serviço", _service!),
        const SizedBox(height: 10),
        _summaryTile(
            "Médico",
            _doctorId != null
                ? (_doctors.firstWhere((d) => d.id == _doctorId!).name)
                : ""),
        const SizedBox(height: 10),
        _summaryTile("Data e Hora", "${_ddmes(d)}\n$horario"),
        const SizedBox(height: 10),
        _summaryTile("Endereço", addr),
        if (_filePath != null) ...[
          const SizedBox(height: 10),
          _summaryTile(
              "Arquivo", _filePath!.split(Platform.pathSeparator).last),
        ],
        const Spacer(),
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.blue),
            onPressed: _confirm,
            child: const Text("AGENDAR",
                style: TextStyle(
                    color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ),
      ],
    );
  }

  Widget _summaryTile(String title, String value) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE0E6F0))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  color: Color(0xFF6E84A3), fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(value,
              style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.blackText)),
        ],
      ),
    );
  }

  Widget _primaryButton(
      {required String label, required VoidCallback onPressed}) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(backgroundColor: AppColors.blue),
        onPressed: onPressed,
        child: Text(label,
            style: const TextStyle(
                color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }
}
