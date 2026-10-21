import type { Usuario } from "../../entities/usuario";
import type { UsuarioRepository } from "../usuario.repository";

export default class UsuarioRepositoryEnMemoria implements UsuarioRepository {
  constructor(private readonly usuarios: Usuario[]) {}

  async buscarPorId(id: number): Promise<Usuario | null> {
    return this.usuarios.find((u) => u.id === id) ?? null;
  }
}
