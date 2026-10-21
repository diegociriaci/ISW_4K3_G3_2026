import type Database from "better-sqlite3";
import type { Usuario } from "../../entities/usuario";
import type { UsuarioRepository } from "../usuario.repository";

export default class UsuarioRepositorySQLite implements UsuarioRepository {
  constructor(private readonly db: Database.Database) {}

  async buscarPorId(id: number): Promise<Usuario | null> {
    const usuario = this.db
      .prepare("SELECT id, nombre, email FROM usuarios WHERE id = ?")
      .get(id) as Usuario | undefined;
    return usuario ?? null;
  }
}
