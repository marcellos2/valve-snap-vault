import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { CheckCircle2, Clock, TrendingUp, Calendar, Loader2 } from "lucide-react";

interface MonthlyData {
  month: string;
  monthLabel: string;
  concluido: number;
  em_andamento: number;
  total: number;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const InspectionReports = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    const fetchRecords = async () => {
      setIsLoading(true);
      try {
        const startDate = new Date(parseInt(selectedYear), 0, 1).toISOString();
        const endDate = new Date(parseInt(selectedYear), 11, 31, 23, 59, 59).toISOString();

        const { data, error } = await supabase
          .from("inspection_records")
          .select("inspection_date, status")
          .gte("inspection_date", startDate)
          .lte("inspection_date", endDate)
          .order("inspection_date", { ascending: true });

        if (error) throw error;
        setRecords(data || []);
      } catch (error) {
        console.error("Erro ao carregar relatórios:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecords();
  }, [selectedYear]);

  const monthlyData: MonthlyData[] = useMemo(() => {
    const data: MonthlyData[] = MONTHS.map((label, i) => ({
      month: String(i + 1).padStart(2, "0"),
      monthLabel: label.substring(0, 3),
      concluido: 0,
      em_andamento: 0,
      total: 0,
    }));

    records.forEach(record => {
      const date = new Date(record.inspection_date);
      const monthIndex = date.getMonth();
      if (record.status === "concluido") {
        data[monthIndex].concluido++;
      } else {
        data[monthIndex].em_andamento++;
      }
      data[monthIndex].total++;
    });

    return data;
  }, [records]);

  const totals = useMemo(() => {
    const concluido = records.filter(r => r.status === "concluido").length;
    const pendente = records.filter(r => r.status !== "concluido").length;
    return { concluido, pendente, total: records.length };
  }, [records]);

  const pieData = useMemo(() => [
    { name: "Concluídas", value: totals.concluido },
    { name: "Pendentes", value: totals.pendente },
  ], [totals]);

  const COLORS = ["hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)"];

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => (current - i).toString());
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Year selector */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Relatório Anual
        </h3>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-28 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 border border-border bg-card text-center">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totals.total}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Total</p>
        </Card>
        <Card className="p-4 border border-border bg-card text-center">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
          <p className="text-2xl font-bold text-success">{totals.concluido}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Concluídas</p>
        </Card>
        <Card className="p-4 border border-border bg-card text-center">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mx-auto mb-2">
            <Clock className="w-5 h-5 text-warning" />
          </div>
          <p className="text-2xl font-bold text-warning">{totals.pendente}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Pendentes</p>
        </Card>
      </div>

      {/* Bar chart */}
      <Card className="p-5 border border-border bg-card">
        <h4 className="font-bold text-sm text-foreground mb-4">Inspeções por Mês</h4>
        {totals.total === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhuma inspeção registrada em {selectedYear}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="concluido" name="Concluídas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="em_andamento" name="Pendentes" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Pie chart */}
      {totals.total > 0 && (
        <Card className="p-5 border border-border bg-card">
          <h4 className="font-bold text-sm text-foreground mb-4">Distribuição Geral</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Legend 
                wrapperStyle={{ fontSize: "12px" }}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Monthly breakdown table */}
      {totals.total > 0 && (
        <Card className="border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h4 className="font-bold text-sm text-foreground">Detalhamento Mensal</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-semibold text-muted-foreground">Mês</th>
                  <th className="text-center p-3 font-semibold text-success">Concluídas</th>
                  <th className="text-center p-3 font-semibold text-warning">Pendentes</th>
                  <th className="text-center p-3 font-semibold text-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.filter(m => m.total > 0).map(month => (
                  <tr key={month.month} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-medium text-foreground">
                      {MONTHS[parseInt(month.month) - 1]}
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {month.concluido}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center gap-1 text-warning">
                        <Clock className="w-3.5 h-3.5" />
                        {month.em_andamento}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-foreground">{month.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
