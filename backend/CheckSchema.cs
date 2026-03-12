using Microsoft.Data.SqlClient;
using System;

class Program {
    static void Main() {
        string connStr = ""Server=LAPTOP-S340\\SQLEXPRESS;Database=BlueSkyClone;Trusted_Connection=True;TrustServerCertificate=True;"";
        using var conn = new SqlConnection(connStr);
        conn.Open();
        using var cmd = new SqlCommand(""SELECT table_name, column_name FROM information_schema.columns WHERE table_name IN ('Posts', 'UserSettings') ORDER BY table_name, column_name"", conn);
        using var reader = cmd.ExecuteReader();
        while (reader.Read()) {
            Console.WriteLine($""{reader[""table_name""]}: {reader[""column_name""]}"");
        }
    }
}
