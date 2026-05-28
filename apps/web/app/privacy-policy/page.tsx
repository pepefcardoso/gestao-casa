"use client";

import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type React from "react";

export default function PrivacyPolicyPage(): React.JSX.Element {
  return (
    <div className="bg-[#f0f4f4] min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-3xl w-full bg-white border border-slate-200/80 rounded-2xl shadow-xl p-6 sm:p-10 space-y-8 relative z-10">
        {/* Header */}
        <div className="space-y-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Cadastro
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-3xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                Política de Privacidade
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-semibold uppercase tracking-wider">
                Pillar · Conforme LGPD (Lei nº 13.709/18) · Maio de 2026
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-slate max-w-none text-slate-600 space-y-6 text-sm sm:text-base leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-800">1. Coleta e Finalidade dos Dados</h2>
            <p>
              Em total compromisso com o princípio da <strong>Minimização de Dados</strong> da LGPD,
              coletamos apenas as informações estritamente necessárias para o funcionamento básico
              da plataforma:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Nome:</strong> Utilizado para identificar você perante outros membros da sua
                residência.
              </li>
              <li>
                <strong>E-mail:</strong> Utilizado para identificação única de acesso, recuperação
                de senha e contato operacional.
              </li>
              <li>
                <strong>Senha:</strong> Criptografada e armazenada de forma segura para permitir a
                autenticação.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-800">
              2. Direitos dos Titulares de Dados
            </h2>
            <p>
              Conforme disposto no Artigo 18 da LGPD, garantimos a você o pleno controle sobre os
              seus dados pessoais. Você pode exercer os seguintes direitos diretamente pela
              plataforma:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Direito de Acesso e Retificação:</strong> Visualize seus dados logados e
                atualize-os a qualquer momento no seu perfil.
              </li>
              <li>
                <strong>Direito à Portabilidade:</strong> Baixe uma cópia completa de todos os seus
                dados pessoais e de residência cadastrados em formato JSON.
              </li>
              <li>
                <strong>Direito de Exclusão (Esquecimento):</strong> Exclua permanentemente sua
                conta. Isso remove seus dados cadastrais dos nossos bancos de dados ativos de forma
                definitiva.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-800">3. Segurança dos Dados</h2>
            <p>
              Implementamos medidas administrativas e técnicas robustas para proteger suas
              informações pessoais de acessos não autorizados ou destruição indesejada:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Uso de criptografia de ponta a ponta (hashing seguro) para guarda de senhas.</li>
              <li>
                Cookies de sessão marcados com diretiva <code>httpOnly</code> e criptografados.
              </li>
              <li>Isolação de dados domésticos por meio de níveis de permissões de membros.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-800">4. Compartilhamento de Dados</h2>
            <p>
              Nós **nunca vendemos, alugamos ou comercializamos** seus dados pessoais com quaisquer
              terceiros. O acesso aos seus dados de gastos e planejamento de casa é restrito
              unicamente a você e aos demais membros da residência com os quais você escolher
              compartilhar o seu código de acesso doméstico.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-800">5. Retenção de Dados</h2>
            <p>
              Mantemos os seus dados armazenados somente pelo tempo em que a sua conta estiver ativa
              na nossa plataforma. Assim que você decide excluir sua conta por meio do botão de
              autoexclusão no painel de perfil, todos os dados de identificação pessoal associados
              são eliminados permanentemente.
            </p>
          </section>
        </div>

        <div className="border-t border-slate-100 pt-6 text-center">
          <p className="text-xs text-slate-400 font-medium">
            Em caso de dúvidas ou solicitações referentes à proteção de dados pessoais, nossa equipe
            estará disponível para esclarecimentos adicionais.
          </p>
        </div>
      </div>
    </div>
  );
}
