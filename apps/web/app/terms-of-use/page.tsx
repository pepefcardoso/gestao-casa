"use client";

import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import type React from "react";

export default function TermsOfUsePage(): React.JSX.Element {
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
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                Termos de Uso
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-semibold uppercase tracking-wider">
                Pillar · Última atualização: Maio de 2026
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-slate max-w-none text-slate-600 space-y-6 text-sm sm:text-base leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-800">1. Aceitação dos Termos</h2>
            <p>
              Ao criar uma conta ou utilizar a plataforma Pillar, você concorda em cumprir e estar
              vinculado a estes Termos de Uso. Caso não concorde com qualquer uma das condições
              dispostas, solicitamos que não realize o cadastro ou utilize os nossos serviços.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-800">2. Descrição do Serviço</h2>
            <p>
              O Pillar é uma ferramenta digital voltada para o planejamento, controle e rateio
              financeiro de despesas, orçamentos, cômodos e financiamento residencial de habitações
              compartilhadas. A plataforma é fornecida "como está" e tem caráter meramente de
              suporte administrativo pessoal.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-800">3. Cadastro e Segurança</h2>
            <p>
              Para acessar as funcionalidades, você deve criar uma conta fornecendo dados verídicos,
              completos e atualizados (como nome e e-mail). Você é inteiramente responsável por
              manter a confidencialidade de sua senha e por qualquer atividade realizada sob sua
              conta.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-800">
              4. Responsabilidade das Informações
            </h2>
            <p>
              Todas as informações de despesas, receitas, valores de propriedades, juros e dados de
              financiamento são inseridas pelos próprios usuários. O Pillar não realiza qualquer
              validação financeira externa, auditoria contábil ou jurídica sobre estes valores, não
              sendo responsável por eventuais erros de cálculo resultantes de inputs imprecisos.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-800">5. Encerramento de Contas</h2>
            <p>
              Em conformidade com a LGPD e políticas internas da plataforma, você possui o direito
              de excluir permanentemente sua conta a qualquer momento por meio de nosso painel de
              perfil. O encerramento acarretará a eliminação definitiva de todos os dados do
              usuário.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-black text-slate-800">6. Alterações nos Termos</h2>
            <p>
              Nós nos reservamos o direito de alterar estes Termos de Uso a qualquer momento.
              Modificações entrarão em vigor imediatamente após sua publicação na plataforma. O uso
              continuado do sistema após tais mudanças constituirá sua aceitação das novas regras.
            </p>
          </section>
        </div>

        <div className="border-t border-slate-100 pt-6 text-center">
          <p className="text-xs text-slate-400 font-medium">
            Se você tiver dúvidas sobre estes Termos de Uso, entre em contato com nossa equipe de
            suporte.
          </p>
        </div>
      </div>
    </div>
  );
}
