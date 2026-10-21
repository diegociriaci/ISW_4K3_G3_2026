import type { Usuario } from "../entities/usuario";

export interface UsuarioRepository {
  buscarPorId(id: number): Promise<Usuario | null>;
}
