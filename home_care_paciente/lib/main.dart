import 'package:flutter/material.dart';
import 'core/colors.dart';
import 'core/auth_store.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/agenda_screen.dart';
import 'screens/new_service_screen.dart';
import 'screens/perfil_screen.dart';
import 'core/time.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  Time.init(); // <- faltava o ';' aqui
  runApp(const HomeCareApp());
}

class HomeCareApp extends StatelessWidget {
  const HomeCareApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Home Care',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: AppColors.background,
        colorScheme: ColorScheme.fromSeed(seedColor: AppColors.blue),
        useMaterial3: true,
      ),
      // A tela inicial é decidida dinamicamente (logado ou não)
      home: const _AuthGate(),
      routes: {
        '/login': (_) => const LoginScreen(),
        '/home': (_) => const HomeScreen(),
        '/agenda': (_) => const AgendaScreen(),
        '/novo-servico': (_) => const NewServiceScreen(),
        '/perfil': (_) => const PerfilScreen(),
      },
    );
  }
}

class _AuthGate extends StatefulWidget {
  const _AuthGate({super.key});

  @override
  State<_AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<_AuthGate> {
  Future<bool>? _future;

  @override
  void initState() {
    super.initState();
    _future = AuthStore.I.isLogged();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<bool>(
      future: _future,
      builder: (context, snap) {
        if (!snap.hasData) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        final logged = snap.data == true;
        return logged ? const HomeScreen() : const LoginScreen();
      },
    );
  }
}
