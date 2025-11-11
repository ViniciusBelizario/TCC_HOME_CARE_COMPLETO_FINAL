import 'package:flutter/material.dart';
import '../core/colors.dart';
import '../widgets/custom_button.dart';
import '../utils/cpf_utils.dart';
import 'package:flutter/services.dart';
import '../core/auth_store.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final cpfController = TextEditingController();
  final senhaController = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    cpfController.dispose();
    senhaController.dispose();
    super.dispose();
  }

  Future<void> _fazerLogin() async {
    final cpf = cpfController.text.trim();
    final senha = senhaController.text;

    if (!validarCPF(cpf)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('CPF inválido!')));
      return;
    }
    if (senha.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Informe a senha.')));
      return;
    }

    setState(() => _loading = true);
    try {
      final ok = await AuthStore.I.loginWithCpf(cpf: cpf, password: senha);
      if (!mounted) return;
      if (ok) {
        Navigator.pushReplacementNamed(context, '/home');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Usuário ou senha incorretos!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao autenticar: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: SingleChildScrollView(
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 24),
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(28),
              boxShadow: [
                BoxShadow(
                  color: AppColors.shadow,
                  blurRadius: 18,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  "Login",
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: AppColors.blackText,
                  ),
                ),
                const SizedBox(height: 32),
                TextField(
                  controller: cpfController,
                  keyboardType: TextInputType.number,
                  maxLength: 11,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(11),
                  ],
                  decoration: const InputDecoration(
                    labelText: "CPF",
                    counterText: "",
                  ),
                ),
                const SizedBox(height: 18),
                TextField(
                  controller: senhaController,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: "Senha"),
                ),
                const SizedBox(height: 12),
                CustomButton(
                  text: _loading ? "Entrando..." : "LOGIN",
                  onPressed: _loading ? null : _fazerLogin,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
