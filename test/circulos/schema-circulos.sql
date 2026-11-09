-- Complemento de bancodeDadosTemp.sql para o MariaDB descartável de testes.
ALTER TABLE circulo ADD COLUMN deleted_at timestamp NULL DEFAULT NULL;

CREATE TABLE bloqueio_circulo (
  id_bloqueio bigint NOT NULL AUTO_INCREMENT,
  fk_circulo_id_circulo bigint NOT NULL,
  fk_usuario_id_usuario bigint NOT NULL,
  fk_bloqueado_por_id_usuario bigint NOT NULL,
  data_bloqueio timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_bloqueio),
  UNIQUE KEY UQ_bloqueio_usuario_circulo (fk_usuario_id_usuario, fk_circulo_id_circulo),
  FOREIGN KEY (fk_circulo_id_circulo) REFERENCES circulo (id_circulo) ON DELETE CASCADE,
  FOREIGN KEY (fk_usuario_id_usuario) REFERENCES usuario (id_usuario),
  FOREIGN KEY (fk_bloqueado_por_id_usuario) REFERENCES usuario (id_usuario)
) ENGINE=InnoDB;
