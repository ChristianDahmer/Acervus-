CREATE TABLE "booking_items" (
	"tenant_id" text NOT NULL,
	"booking_id" integer NOT NULL,
	"stock_item_id" integer NOT NULL,
	"quantidade" integer NOT NULL,
	CONSTRAINT "booking_items_tenant_id_booking_id_stock_item_id_pk" PRIMARY KEY("tenant_id","booking_id","stock_item_id")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"tenant_id" text NOT NULL,
	"id" integer NOT NULL,
	"cliente_id" integer NOT NULL,
	"data_retirada" bigint NOT NULL,
	"data_devolucao" bigint NOT NULL,
	"status" text DEFAULT 'PENDENTE' NOT NULL,
	"origem_proposta_id" text,
	"proposta_aprovada" boolean DEFAULT false,
	"contrato_assinado_text" text,
	"hash_assinatura_digital" text,
	"data_assinatura" bigint,
	"percentual_calcao" numeric(5, 2) DEFAULT '30.00',
	"valor_calcao" numeric(12, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_tenant_id_id_pk" PRIMARY KEY("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"tenant_id" text NOT NULL,
	"id" integer NOT NULL,
	"nome" text NOT NULL,
	"telefone" text NOT NULL,
	"email" text,
	"cpf_cnpj" text,
	"endereco" text,
	"observacoes" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clients_tenant_id_id_pk" PRIMARY KEY("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "financial_transactions" (
	"tenant_id" text NOT NULL,
	"id" text NOT NULL,
	"tipo" text NOT NULL,
	"categoria" text NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"data" bigint NOT NULL,
	"descricao" text NOT NULL,
	"referencia_id" text,
	"status" text DEFAULT 'PENDENTE' NOT NULL,
	CONSTRAINT "financial_transactions_tenant_id_id_pk" PRIMARY KEY("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "maintenance_records" (
	"tenant_id" text NOT NULL,
	"id" text NOT NULL,
	"stock_item_id" integer NOT NULL,
	"data" bigint NOT NULL,
	"tipo" text NOT NULL,
	"custo" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"observacao" text,
	"responsavel" text,
	CONSTRAINT "maintenance_records_tenant_id_id_pk" PRIMARY KEY("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "stock_items" (
	"tenant_id" text NOT NULL,
	"id" integer NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"quantidade_total" integer DEFAULT 1 NOT NULL,
	"quantidade_manutencao" integer DEFAULT 0 NOT NULL,
	"preco_aluguel" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"categoria" text DEFAULT 'Geral' NOT NULL,
	"is_kit" boolean DEFAULT false NOT NULL,
	"kit_componentes" jsonb,
	"ultima_manutencao" bigint,
	"frequencia_alugueis_manutencao" integer DEFAULT 5,
	"alugueis_desde_manutencao" integer DEFAULT 0,
	"status_manutencao" text DEFAULT 'EM_DIA',
	"proxima_revisao_data" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_items_tenant_id_id_pk" PRIMARY KEY("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "tenant_configs" (
	"tenant_id" text NOT NULL,
	"config_name" text NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_configs_tenant_id_config_name_pk" PRIMARY KEY("tenant_id","config_name")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"nome_fantasia" text NOT NULL,
	"razao_social" text,
	"cnpj" text,
	"telefone_whatsapp" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_forms" (
	"tenant_id" text NOT NULL,
	"id" text NOT NULL,
	"titulo" text NOT NULL,
	"cliente_id" integer,
	"cliente_nome" text,
	"cliente_telefone" text,
	"itens" jsonb NOT NULL,
	"criado_em" bigint NOT NULL,
	"respondido" boolean DEFAULT false NOT NULL,
	"google_form_url" text,
	"google_drive_file_id" text,
	"texto_introducao" text,
	"percentual_calcao" numeric(5, 2) DEFAULT '30.00',
	"validade_dias" integer DEFAULT 7 NOT NULL,
	"recusado" boolean DEFAULT false,
	"motivo_recusa" text,
	"data_recusa" bigint,
	"resposta" jsonb,
	CONSTRAINT "web_forms_tenant_id_id_pk" PRIMARY KEY("tenant_id","id")
);
--> statement-breakpoint
CREATE INDEX "idx_booking_items_stock" ON "booking_items" USING btree ("tenant_id","stock_item_id","booking_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_tenant_dates" ON "bookings" USING btree ("tenant_id","data_retirada","data_devolucao","status");--> statement-breakpoint
CREATE INDEX "idx_bookings_tenant_id" ON "bookings" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE INDEX "idx_bookings_tenant_cliente" ON "bookings" USING btree ("tenant_id","cliente_id");--> statement-breakpoint
CREATE INDEX "idx_clients_tenant_id" ON "clients" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE INDEX "idx_clients_tenant_telefone" ON "clients" USING btree ("tenant_id","telefone");--> statement-breakpoint
CREATE INDEX "idx_clients_tenant_nome" ON "clients" USING btree ("tenant_id","nome");--> statement-breakpoint
CREATE INDEX "idx_fin_tenant_data" ON "financial_transactions" USING btree ("tenant_id","data");--> statement-breakpoint
CREATE INDEX "idx_maint_tenant_stock" ON "maintenance_records" USING btree ("tenant_id","stock_item_id");--> statement-breakpoint
CREATE INDEX "idx_stock_tenant_id" ON "stock_items" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE INDEX "idx_stock_tenant_categoria" ON "stock_items" USING btree ("tenant_id","categoria");--> statement-breakpoint
CREATE INDEX "idx_stock_tenant_status_manutencao" ON "stock_items" USING btree ("tenant_id","status_manutencao");--> statement-breakpoint
CREATE INDEX "idx_tenant_configs_tenant_config" ON "tenant_configs" USING btree ("tenant_id","config_name");--> statement-breakpoint
CREATE INDEX "idx_webforms_tenant_id" ON "web_forms" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE INDEX "idx_webforms_tenant_criado_em" ON "web_forms" USING btree ("tenant_id","criado_em");--> statement-breakpoint
CREATE INDEX "idx_webforms_tenant_respondido" ON "web_forms" USING btree ("tenant_id","respondido");