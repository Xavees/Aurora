/*M!999999\- enable the sandbox mode */ 

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `alerta_sos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `alerta_sos` (
  `id_alerta` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do alerta de emergência',
  `data_hora_inicio` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Data e hora do disparo do SOS',
  `data_hora_fim` timestamp NULL DEFAULT NULL COMMENT 'Data e hora de encerramento do alerta',
  `latitude` decimal(10,8) NOT NULL COMMENT 'Latitude exata no momento da ativação',
  `longitude` decimal(11,8) NOT NULL COMMENT 'Longitude exata no momento da ativação',
  `origem` enum('APP','DISPOSITIVO') NOT NULL DEFAULT 'APP' COMMENT 'Origem do acionamento (Aplicativo ou Botão Físico)',
  `status` enum('ATIVO','ENCERRADO','CANCELADO') DEFAULT 'ATIVO' COMMENT 'Status atual do alerta no sistema',
  `fk_usuario_id_usuario` bigint(20) NOT NULL COMMENT 'Chave estrangeira do usuário em emergência',
  `fk_dispositivo_id_dispositivo` bigint(20) DEFAULT NULL COMMENT 'Chave estrangeira do hardware responsável (se aplicável)',
  PRIMARY KEY (`id_alerta`),
  KEY `fk_alerta_usuario` (`fk_usuario_id_usuario`),
  KEY `fk_alerta_dispositivo` (`fk_dispositivo_id_dispositivo`),
  CONSTRAINT `fk_alerta_dispositivo` FOREIGN KEY (`fk_dispositivo_id_dispositivo`) REFERENCES `dispositivo_embarcado` (`id_dispositivo`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_alerta_usuario` FOREIGN KEY (`fk_usuario_id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Histórico e status dos alertas de emergência (SOS)';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `area_de_risco`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `area_de_risco` (
  `id_area_risco` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do perímetro de risco',
  `nome_area` varchar(100) NOT NULL COMMENT 'Nome identificador da zona (ex: Travessia Iluminada Inoperante)',
  `descricao_area` varchar(255) DEFAULT NULL COMMENT 'Detalhamento do risco local para prevenção',
  `nivel_risco` enum('BAIXO','MEDIO','ALTO') DEFAULT NULL COMMENT 'Classificação da gravidade da zona',
  `raio_metros` decimal(11,8) DEFAULT NULL COMMENT 'Raio de abrangência do perímetro de alerta',
  `latitude` decimal(10,8) NOT NULL COMMENT 'Latitude do centro geométrico do perímetro',
  `longitude` decimal(11,8) NOT NULL COMMENT 'Longitude do centro geométrico do perímetro',
  `data_criacao` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Data e hora da adição da área',
  `data_atualizacao` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'Data e hora da última modificação',
  `fk_usuario_id_usuario` bigint(20) DEFAULT NULL COMMENT 'Chave estrangeira do usuário autor do registro',
  PRIMARY KEY (`id_area_risco`),
  KEY `fk_area_risco_usuario` (`fk_usuario_id_usuario`),
  CONSTRAINT `fk_area_risco_usuario` FOREIGN KEY (`fk_usuario_id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mapeamento colaborativo de áreas urbanas de risco';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `bloqueio_circulo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `bloqueio_circulo` (
  `id_bloqueio` bigint(20) NOT NULL AUTO_INCREMENT,
  `fk_circulo_id_circulo` bigint(20) NOT NULL,
  `fk_usuario_id_usuario` bigint(20) NOT NULL,
  `fk_bloqueado_por_id_usuario` bigint(20) NOT NULL,
  `data_bloqueio` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_bloqueio`),
  UNIQUE KEY `UQ_bloqueio_usuario_circulo` (`fk_usuario_id_usuario`,`fk_circulo_id_circulo`),
  KEY `fk_bloqueio_circulo` (`fk_circulo_id_circulo`),
  KEY `fk_bloqueio_administrador` (`fk_bloqueado_por_id_usuario`),
  CONSTRAINT `fk_bloqueio_administrador` FOREIGN KEY (`fk_bloqueado_por_id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `fk_bloqueio_circulo` FOREIGN KEY (`fk_circulo_id_circulo`) REFERENCES `circulo` (`id_circulo`) ON DELETE CASCADE,
  CONSTRAINT `fk_bloqueio_usuario` FOREIGN KEY (`fk_usuario_id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `circulo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `circulo` (
  `id_circulo` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do círculo de compartilhamento',
  `codigo_convite` varchar(10) NOT NULL COMMENT 'Código alfanumérico único para entrada no grupo',
  `nome` varchar(100) NOT NULL COMMENT 'Nome do grupo (ex: Família, Trabalho, Faculdade)',
  `data_criacao` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Data e hora de criação do círculo',
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_circulo`),
  UNIQUE KEY `codigo_convite` (`codigo_convite`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Círculos privados de acompanhamento de segurança';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `contato_de_emergencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `contato_de_emergencia` (
  `id_contato` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do contato de emergência',
  `nome` varchar(100) NOT NULL COMMENT 'Nome completo do contato de confiança',
  `parentesco` varchar(50) DEFAULT NULL COMMENT 'Grau de parentesco ou relação (ex: Mãe, Pai, Amigo)',
  `telefone` varchar(20) NOT NULL COMMENT 'Número de telefone para envio de alertas e chamadas',
  `fk_usuario_id_usuario` bigint(20) NOT NULL COMMENT 'Chave estrangeira do usuário proprietário do contato',
  PRIMARY KEY (`id_contato`),
  KEY `fk_contato_usuario` (`fk_usuario_id_usuario`),
  CONSTRAINT `fk_contato_usuario` FOREIGN KEY (`fk_usuario_id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Contatos de emergência acionados em eventos SOS';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dispositivo_embarcado`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `dispositivo_embarcado` (
  `id_dispositivo` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária interna do dispositivo',
  `mac_address` varchar(64) NOT NULL COMMENT 'Endereço físico MAC do ESP32 (device_uid)',
  `nome` varchar(120) DEFAULT NULL COMMENT 'Nome amigável no aplicativo',
  `modelo` varchar(60) DEFAULT 'ESP32 + NEO-6M' COMMENT 'Modelo de hardware e GPS',
  `firmware` varchar(30) DEFAULT NULL COMMENT 'Versão do firmware compilado',
  `nivel_bateria` int(11) DEFAULT NULL COMMENT 'Última porcentagem de bateria reportada (0-100%)',
  `status_dispositivo` varchar(30) DEFAULT 'ATIVO' COMMENT 'Status operacional (ex: ATIVO, INATIVO, SOS_ATIVO)',
  `tipo_conexao` varchar(30) DEFAULT NULL COMMENT 'Meio de comunicação atual (BLE, WI-FI, GSM)',
  `ativo` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = Ativo, 0 = Inativo/Bloqueado',
  `ultimo_contato` datetime DEFAULT NULL COMMENT 'Timestamp do último pacote recebido',
  `criado_em` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Data do cadastro inicial',
  `fk_usuario_id_usuario` bigint(20) DEFAULT NULL COMMENT 'Chave estrangeira do usuário proprietário do hardware',
  PRIMARY KEY (`id_dispositivo`),
  UNIQUE KEY `mac_address` (`mac_address`),
  KEY `fk_dispositivo_usuario` (`fk_usuario_id_usuario`),
  CONSTRAINT `fk_dispositivo_usuario` FOREIGN KEY (`fk_usuario_id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cadastro e status dos rastreadores ESP32';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `historico_localizacao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `historico_localizacao` (
  `id_localizacao` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'Chave primária da leitura de telemetria',
  `fk_dispositivo_id_dispositivo` bigint(20) DEFAULT NULL COMMENT 'Chave estrangeira do dispositivo emissor (se enviado via hardware)',
  `fk_usuario_id_usuario` bigint(20) NOT NULL COMMENT 'Chave estrangeira do usuário rastreado',
  `latitude` decimal(10,7) NOT NULL COMMENT 'Latitude em graus decimais (-90 a 90)',
  `longitude` decimal(11,7) NOT NULL COMMENT 'Longitude em graus decimais (-180 a 180)',
  `altitude_m` decimal(8,2) DEFAULT NULL COMMENT 'Altitude em metros acima do nível do mar',
  `velocidade_kmh` decimal(6,2) DEFAULT NULL COMMENT 'Velocidade calculada em km/h',
  `satelites` tinyint(3) unsigned DEFAULT NULL COMMENT 'Quantidade de satélites GPS sincronizados',
  `bateria` int(11) DEFAULT NULL COMMENT 'Porcentagem da bateria no momento da leitura (0-100%)',
  `sos` tinyint(1) NOT NULL DEFAULT 0 COMMENT '0 = Leitura de rotina, 1 = Alerta SOS acionado',
  `data_hora_gps` datetime NOT NULL COMMENT 'Timestamp capturado pelo GPS/Smartphone',
  `recebido_em` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Timestamp de chegada no servidor',
  `ip_origem` varchar(45) DEFAULT NULL COMMENT 'IP do dispositivo ou do smartphone que realizou a requisição',
  PRIMARY KEY (`id_localizacao`),
  UNIQUE KEY `uk_localizacoes_ponto` (`fk_usuario_id_usuario`,`data_hora_gps`),
  KEY `idx_historico_consulta` (`fk_usuario_id_usuario`,`data_hora_gps`),
  KEY `fk_historico_dispositivo` (`fk_dispositivo_id_dispositivo`),
  CONSTRAINT `fk_historico_dispositivo` FOREIGN KEY (`fk_dispositivo_id_dispositivo`) REFERENCES `dispositivo_embarcado` (`id_dispositivo`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_historico_usuario` FOREIGN KEY (`fk_usuario_id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Histórico de telemetria e posições do usuário e hardware';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `membro_do_circulo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `membro_do_circulo` (
  `id_membro` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do registro do membro',
  `funcao` enum('ADMINISTRADOR','MEMBRO') NOT NULL DEFAULT 'MEMBRO',
  `data_entrada` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Data e hora de entrada no círculo',
  `fk_usuario_id_usuario` bigint(20) NOT NULL COMMENT 'Chave estrangeira do usuário participante',
  `fk_circulo_id_circulo` bigint(20) NOT NULL COMMENT 'Chave estrangeira do círculo ao qual pertence',
  PRIMARY KEY (`id_membro`),
  UNIQUE KEY `uq_membro_usuario_circulo` (`fk_usuario_id_usuario`,`fk_circulo_id_circulo`),
  KEY `fk_membro_usuario` (`fk_usuario_id_usuario`),
  KEY `fk_membro_circulo` (`fk_circulo_id_circulo`),
  CONSTRAINT `fk_membro_circulo` FOREIGN KEY (`fk_circulo_id_circulo`) REFERENCES `circulo` (`id_circulo`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_membro_usuario` FOREIGN KEY (`fk_usuario_id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Associação N:M entre Usuários e Círculos';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `mensagem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `mensagem` (
  `id_chat_texto` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária da mensagem',
  `tipo_mensagem` enum('TEXTO','AUDIO','IMAGEM') NOT NULL DEFAULT 'TEXTO' COMMENT 'Tipo do conteúdo enviado',
  `texto` text DEFAULT NULL COMMENT 'Texto da mensagem ou transcrição do áudio',
  `url_midia` varchar(512) DEFAULT NULL COMMENT 'URL pública do arquivo de áudio ou mídia no Cloud Storage',
  `duracao_segundos` int(11) DEFAULT NULL COMMENT 'Duração do áudio em segundos (se tipo_mensagem = AUDIO)',
  `status_envio` enum('PENDENTE','ENVIADA','LIDA') DEFAULT 'ENVIADA' COMMENT 'Status de entrega da mensagem',
  `data_hora` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Data e hora do envio',
  `fk_usuario_id_usuario` bigint(20) NOT NULL COMMENT 'Chave estrangeira do usuário remetente',
  `fk_contato_id_contato` bigint(20) DEFAULT NULL COMMENT 'Chave estrangeira do contato destinatário (se mensagem direta)',
  `fk_circulo_id_circulo` bigint(20) DEFAULT NULL COMMENT 'Chave estrangeira do círculo destinatário (se mensagem em grupo)',
  PRIMARY KEY (`id_chat_texto`),
  KEY `fk_mensagem_usuario` (`fk_usuario_id_usuario`),
  KEY `fk_mensagem_contato` (`fk_contato_id_contato`),
  KEY `fk_mensagem_circulo` (`fk_circulo_id_circulo`),
  CONSTRAINT `fk_mensagem_circulo` FOREIGN KEY (`fk_circulo_id_circulo`) REFERENCES `circulo` (`id_circulo`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_mensagem_contato` FOREIGN KEY (`fk_contato_id_contato`) REFERENCES `contato_de_emergencia` (`id_contato`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_mensagem_usuario` FOREIGN KEY (`fk_usuario_id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Histórico de mensagens de texto e áudio da rede de segurança';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notifica`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifica` (
  `fk_alerta_sos_id_alerta` bigint(20) NOT NULL COMMENT 'Chave estrangeira do alerta SOS ativo',
  `fk_circulo_id_circulo` bigint(20) NOT NULL COMMENT 'Chave estrangeira do círculo de acompanhamento notificado',
  PRIMARY KEY (`fk_alerta_sos_id_alerta`,`fk_circulo_id_circulo`),
  KEY `fk_notifica_circulo` (`fk_circulo_id_circulo`),
  CONSTRAINT `fk_notifica_alerta` FOREIGN KEY (`fk_alerta_sos_id_alerta`) REFERENCES `alerta_sos` (`id_alerta`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notifica_circulo` FOREIGN KEY (`fk_circulo_id_circulo`) REFERENCES `circulo` (`id_circulo`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Associação N:M para distribuição de alertas SOS em Círculos';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ocorrencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ocorrencia` (
  `id_ocorrencia` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária da ocorrência criminal',
  `descricao` text NOT NULL COMMENT 'Relato detalhado do incidente reportado',
  `latitude` decimal(10,8) NOT NULL COMMENT 'Latitude do local exato da ocorrência',
  `longitude` decimal(11,8) NOT NULL COMMENT 'Longitude do local exato da ocorrência',
  `data_hora` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Data e hora em que o crime ocorreu',
  `fk_usuario_id_usuario` bigint(20) DEFAULT NULL COMMENT 'Chave estrangeira do usuário denunciante',
  PRIMARY KEY (`id_ocorrencia`),
  KEY `idx_ocorrencia_coords` (`latitude`,`longitude`),
  KEY `fk_ocorrencia_usuario` (`fk_usuario_id_usuario`),
  CONSTRAINT `fk_ocorrencia_usuario` FOREIGN KEY (`fk_usuario_id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro colaborativo de ocorrências policiais e assaltos';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario` (
  `id_usuario` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'Chave primária interna do usuário',
  `firebase_uid` varchar(128) DEFAULT NULL COMMENT 'Identificador único do Firebase Auth (Google / E-mail)',
  `nome` varchar(100) NOT NULL COMMENT 'Nome completo do usuário',
  `email` varchar(100) NOT NULL COMMENT 'Endereço de e-mail único para login e notificações',
  `senha` varchar(255) DEFAULT NULL COMMENT 'Hash da senha (opcional para quem autentica via Google)',
  `telefone` varchar(20) DEFAULT NULL COMMENT 'Número de telefone celular do usuário',
  `foto_url` varchar(255) DEFAULT NULL COMMENT 'URL ou caminho da imagem de perfil',
  `tipo_usuario` enum('COMUM','PREMIUM') DEFAULT 'COMUM' COMMENT 'Nível de assinatura e acesso no sistema',
  `excluido_em` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `firebase_uid` (`firebase_uid`),
  UNIQUE KEY `telefone` (`telefone`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela principal de usuários do aplicativo';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

