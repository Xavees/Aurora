-- =====================================================================
-- BANCO DE DADOS: APP AURORA (SISTEMA DE SEGURANÇA PESSOAL)
-- Versão Final Unificada: Suporte a Telemetria Dual-Mode (BLE/Wi-Fi/GSM)
-- e Mídia/Áudio no Chat.
-- Engine: MySQL 8.0+ / MariaDB 10.3+
-- Padrão: Português do Brasil (pt-BR)
-- =====================================================================

DROP DATABASE IF EXISTS app_aurora;

CREATE DATABASE app_aurora
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE app_aurora;


-- =====================================================================
-- 1. TABELA: USUARIO
-- Armazena os dados cadastrais e credenciais de acesso dos usuários.
-- =====================================================================

CREATE TABLE usuario (
    id_usuario BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Chave primária interna do usuário',
    firebase_uid VARCHAR(128) NULL UNIQUE COMMENT 'Identificador único do Firebase Auth (Google / E-mail)',
    nome VARCHAR(100) NOT NULL COMMENT 'Nome completo do usuário',
    email VARCHAR(100) NOT NULL UNIQUE COMMENT 'Endereço de e-mail único para login e notificações',
    senha VARCHAR(255) NULL COMMENT 'Hash da senha (opcional para quem autentica via Google)',
    telefone VARCHAR(20) UNIQUE COMMENT 'Número de telefone celular do usuário',
    foto_url VARCHAR(255) NULL COMMENT 'URL ou caminho da imagem de perfil',
    tipo_usuario ENUM('COMUM', 'PREMIUM') DEFAULT 'COMUM' COMMENT 'Nível de assinatura e acesso no sistema',
    
    PRIMARY KEY (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela principal de usuários do aplicativo';


-- =====================================================================
-- 2. TABELA: CONTATO_DE_EMERGENCIA
-- Registra a rede de contatos de confiança vinculados a cada usuário.
-- =====================================================================

CREATE TABLE contato_de_emergencia (
    id_contato BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do contato de emergência',
    nome VARCHAR(100) NOT NULL COMMENT 'Nome completo do contato de confiança',
    parentesco VARCHAR(50) NULL COMMENT 'Grau de parentesco ou relação (ex: Mãe, Pai, Amigo)',
    telefone VARCHAR(20) NOT NULL COMMENT 'Número de telefone para envio de alertas e chamadas',
    fk_usuario_id_usuario BIGINT NOT NULL COMMENT 'Chave estrangeira do usuário proprietário do contato',

    PRIMARY KEY (id_contato),
    CONSTRAINT fk_contato_usuario
        FOREIGN KEY (fk_usuario_id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Contatos de emergência acionados em eventos SOS';


-- =====================================================================
-- 3. TABELA: CIRCULO
-- Grupos privados de compartilhamento de localização entre usuários.
-- =====================================================================

CREATE TABLE circulo (
    id_circulo BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do círculo de compartilhamento',
    codigo_convite VARCHAR(10) NOT NULL UNIQUE COMMENT 'Código alfanumérico único para entrada no grupo',
    nome VARCHAR(100) NOT NULL COMMENT 'Nome do grupo (ex: Família, Trabalho, Faculdade)',
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data e hora de criação do círculo',

    PRIMARY KEY (id_circulo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Círculos privados de acompanhamento de segurança';


-- =====================================================================
-- 4. TABELA: MEMBRO_DO_CIRCULO
-- Tabela associativa que gerencia a participação dos usuários nos círculos.
-- =====================================================================

CREATE TABLE membro_do_circulo (
    id_membro BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do registro do membro',
    funcao VARCHAR(30) DEFAULT 'MEMBRO' COMMENT 'Papel do membro no grupo (ex: ADMINISTRADOR, MEMBRO)',
    data_entrada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data e hora de entrada no círculo',
    fk_usuario_id_usuario BIGINT NOT NULL COMMENT 'Chave estrangeira do usuário participante',
    fk_circulo_id_circulo BIGINT NOT NULL COMMENT 'Chave estrangeira do círculo ao qual pertence',

    PRIMARY KEY (id_membro),
    CONSTRAINT fk_membro_usuario
        FOREIGN KEY (fk_usuario_id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_membro_circulo
        FOREIGN KEY (fk_circulo_id_circulo)
        REFERENCES circulo(id_circulo)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Associação N:M entre Usuários e Círculos';


-- =====================================================================
-- 5. TABELA: DISPOSITIVO_EMBARCADO
-- Cadastro e último status conhecido dos rastreadores (ESP32 / GPS NEO-6M).
-- =====================================================================

CREATE TABLE dispositivo_embarcado (
    id_dispositivo BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Chave primária interna do dispositivo',
    mac_address VARCHAR(64) NOT NULL UNIQUE COMMENT 'Endereço físico MAC do ESP32 (device_uid)',
    nome VARCHAR(120) NULL COMMENT 'Nome amigável no aplicativo',
    modelo VARCHAR(60) NULL DEFAULT 'ESP32 + NEO-6M' COMMENT 'Modelo de hardware e GPS',
    firmware VARCHAR(30) NULL COMMENT 'Versão do firmware compilado',
    nivel_bateria INT NULL COMMENT 'Última porcentagem de bateria reportada (0-100%)',
    status_dispositivo VARCHAR(30) DEFAULT 'ATIVO' COMMENT 'Status operacional (ex: ATIVO, INATIVO, SOS_ATIVO)',
    tipo_conexao VARCHAR(30) NULL COMMENT 'Meio de comunicação atual (BLE, WI-FI, GSM)',
    ativo TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Ativo, 0 = Inativo/Bloqueado',
    ultimo_contato DATETIME NULL COMMENT 'Timestamp do último pacote recebido',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data do cadastro inicial',
    fk_usuario_id_usuario BIGINT NULL COMMENT 'Chave estrangeira do usuário proprietário do hardware',

    PRIMARY KEY (id_dispositivo),
    CONSTRAINT fk_dispositivo_usuario
        FOREIGN KEY (fk_usuario_id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cadastro e status dos rastreadores ESP32';


-- =====================================================================
-- 6. TABELA: ALERTA_SOS
-- Registro dos disparos de emergência emitidos pelo aplicativo ou hardware.
-- =====================================================================

CREATE TABLE alerta_sos (
    id_alerta BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do alerta de emergência',
    data_hora_inicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data e hora do disparo do SOS',
    data_hora_fim TIMESTAMP NULL COMMENT 'Data e hora de encerramento do alerta',
    latitude DECIMAL(10, 8) NOT NULL COMMENT 'Latitude exata no momento da ativação',
    longitude DECIMAL(11, 8) NOT NULL COMMENT 'Longitude exata no momento da ativação',
    origem ENUM('APP', 'DISPOSITIVO') NOT NULL DEFAULT 'APP' COMMENT 'Origem do acionamento (Aplicativo ou Botão Físico)',
    status ENUM('ATIVO', 'ENCERRADO', 'CANCELADO') DEFAULT 'ATIVO' COMMENT 'Status atual do alerta no sistema',
    fk_usuario_id_usuario BIGINT NOT NULL COMMENT 'Chave estrangeira do usuário em emergência',
    fk_dispositivo_id_dispositivo BIGINT NULL COMMENT 'Chave estrangeira do hardware responsável (se aplicável)',

    PRIMARY KEY (id_alerta),
    CONSTRAINT fk_alerta_usuario
        FOREIGN KEY (fk_usuario_id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_alerta_dispositivo
        FOREIGN KEY (fk_dispositivo_id_dispositivo)
        REFERENCES dispositivo_embarcado(id_dispositivo)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Histórico e status dos alertas de emergência (SOS)';


-- =====================================================================
-- 7. TABELA: NOTIFICA
-- Tabela associativa entre os Alertas SOS e os Círculos notificados.
-- =====================================================================

CREATE TABLE notifica (
    fk_alerta_sos_id_alerta BIGINT NOT NULL COMMENT 'Chave estrangeira do alerta SOS ativo',
    fk_circulo_id_circulo BIGINT NOT NULL COMMENT 'Chave estrangeira do círculo de acompanhamento notificado',

    PRIMARY KEY (fk_alerta_sos_id_alerta, fk_circulo_id_circulo),
    CONSTRAINT fk_notifica_alerta
        FOREIGN KEY (fk_alerta_sos_id_alerta)
        REFERENCES alerta_sos(id_alerta)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_notifica_circulo
        FOREIGN KEY (fk_circulo_id_circulo)
        REFERENCES circulo(id_circulo)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Associação N:M para distribuição de alertas SOS em Círculos';


-- =====================================================================
-- 8. TABELA: AREA_DE_RISCO
-- Cadastro de zonas com perigo mapeado e alertas preventivos.
-- =====================================================================

CREATE TABLE area_de_risco (
    id_area_risco BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Chave primária do perímetro de risco',
    nome_area VARCHAR(100) NOT NULL COMMENT 'Nome identificador da zona (ex: Travessia Iluminada Inoperante)',
    descricao_area VARCHAR(255) NULL COMMENT 'Detalhamento do risco local para prevenção',
    nivel_risco ENUM('BAIXO', 'MEDIO', 'ALTO') COMMENT 'Classificação da gravidade da zona',
    raio_metros DECIMAL(11, 8) NULL COMMENT 'Raio de abrangência do perímetro de alerta',
    latitude DECIMAL(10, 8) NOT NULL COMMENT 'Latitude do centro geométrico do perímetro',
    longitude DECIMAL(11, 8) NOT NULL COMMENT 'Longitude do centro geométrico do perímetro',
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data e hora da adição da área',
    data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data e hora da última modificação',
    fk_usuario_id_usuario BIGINT NULL COMMENT 'Chave estrangeira do usuário autor do registro',

    PRIMARY KEY (id_area_risco),
    CONSTRAINT fk_area_risco_usuario
        FOREIGN KEY (fk_usuario_id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mapeamento colaborativo de áreas urbanas de risco';


-- =====================================================================
-- 9. TABELA: OCORRENCIA
-- Denúncias e registro colaborativo de crimes urbanos.
-- =====================================================================

CREATE TABLE ocorrencia (
    id_ocorrencia BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Chave primária da ocorrência criminal',
    descricao TEXT NOT NULL COMMENT 'Relato detalhado do incidente reportado',
    latitude DECIMAL(10, 8) NOT NULL COMMENT 'Latitude do local exato da ocorrência',
    longitude DECIMAL(11, 8) NOT NULL COMMENT 'Longitude do local exato da ocorrência',
    data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data e hora em que o crime ocorreu',
    fk_usuario_id_usuario BIGINT NULL COMMENT 'Chave estrangeira do usuário denunciante',

    PRIMARY KEY (id_ocorrencia),
    INDEX idx_ocorrencia_coords (latitude, longitude),
    CONSTRAINT fk_ocorrencia_usuario
        FOREIGN KEY (fk_usuario_id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro colaborativo de ocorrências policiais e assaltos';


-- =====================================================================
-- 10. TABELA: HISTORICO_LOCALIZACAO
-- Telemetria e histórico temporal das coordenadas GPS capturadas (Dual-Mode).
-- =====================================================================

CREATE TABLE historico_localizacao (
    id_localizacao BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Chave primária da leitura de telemetria',
    fk_dispositivo_id_dispositivo BIGINT NULL COMMENT 'Chave estrangeira do dispositivo emissor (se enviado via hardware)',
    fk_usuario_id_usuario BIGINT NOT NULL COMMENT 'Chave estrangeira do usuário rastreado',
    latitude DECIMAL(10, 7) NOT NULL COMMENT 'Latitude em graus decimais (-90 a 90)',
    longitude DECIMAL(11, 7) NOT NULL COMMENT 'Longitude em graus decimais (-180 a 180)',
    altitude_m DECIMAL(8, 2) NULL COMMENT 'Altitude em metros acima do nível do mar',
    velocidade_kmh DECIMAL(6, 2) NULL COMMENT 'Velocidade calculada em km/h',
    satelites TINYINT UNSIGNED NULL COMMENT 'Quantidade de satélites GPS sincronizados',
    bateria INT NULL COMMENT 'Porcentagem da bateria no momento da leitura (0-100%)',
    sos TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0 = Leitura de rotina, 1 = Alerta SOS acionado',
    data_hora_gps DATETIME NOT NULL COMMENT 'Timestamp capturado pelo GPS/Smartphone',
    recebido_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp de chegada no servidor',
    ip_origem VARCHAR(45) NULL COMMENT 'IP do dispositivo ou do smartphone que realizou a requisição',

    PRIMARY KEY (id_localizacao),
    
    -- Restrição de unicidade para prevenir duplicidade de leituras enviadas via rede
    UNIQUE KEY uk_localizacoes_ponto (fk_usuario_id_usuario, data_hora_gps),
    
    -- Índice composto para otimizar busca rápida do último ponto no mapa
    INDEX idx_historico_consulta (fk_usuario_id_usuario, data_hora_gps DESC),

    CONSTRAINT fk_historico_dispositivo
        FOREIGN KEY (fk_dispositivo_id_dispositivo)
        REFERENCES dispositivo_embarcado(id_dispositivo)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_historico_usuario
        FOREIGN KEY (fk_usuario_id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Histórico de telemetria e posições do usuário e hardware';


-- =====================================================================
-- 11. TABELA: MENSAGEM
-- Mensagens trocadas no chat (Texto, Áudio e Mídias) entre usuários/grupos.
-- =====================================================================

CREATE TABLE mensagem (
    id_chat_texto BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Chave primária da mensagem',
    tipo_mensagem ENUM('TEXTO', 'AUDIO', 'IMAGEM') NOT NULL DEFAULT 'TEXTO' COMMENT 'Tipo do conteúdo enviado',
    texto TEXT NULL COMMENT 'Texto da mensagem ou transcrição do áudio',
    url_midia VARCHAR(512) NULL COMMENT 'URL pública do arquivo de áudio ou mídia no Cloud Storage',
    duracao_segundos INT NULL COMMENT 'Duração do áudio em segundos (se tipo_mensagem = AUDIO)',
    status_envio ENUM('PENDENTE', 'ENVIADA', 'LIDA') DEFAULT 'ENVIADA' COMMENT 'Status de entrega da mensagem',
    data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data e hora do envio',
    fk_usuario_id_usuario BIGINT NOT NULL COMMENT 'Chave estrangeira do usuário remetente',
    fk_contato_id_contato BIGINT NULL COMMENT 'Chave estrangeira do contato destinatário (se mensagem direta)',
    fk_circulo_id_circulo BIGINT NULL COMMENT 'Chave estrangeira do círculo destinatário (se mensagem em grupo)',

    PRIMARY KEY (id_chat_texto),
    CONSTRAINT fk_mensagem_usuario
        FOREIGN KEY (fk_usuario_id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_mensagem_contato
        FOREIGN KEY (fk_contato_id_contato)
        REFERENCES contato_de_emergencia(id_contato)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_mensagem_circulo
        FOREIGN KEY (fk_circulo_id_circulo)
        REFERENCES circulo(id_circulo)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Histórico de mensagens de texto e áudio da rede de segurança';