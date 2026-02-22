/**
 * Kullanıcının bir özel yetkiye sahip olup olmadığını kontrol eder.
 * VIP, Admin, Mod rolleri otomatik olarak bu yetkilere sahiptir.
 * Normal kullanıcılar için DB'deki specialPerms alanına bakılır.
 */
export function hasSpecialPerm(
  role: string,
  specialPerms: any,
  perm: "animatedName" | "gifAvatar" | "animatedCinema"
): boolean {
  const r = (role || "").toUpperCase();

  // Rol bazlı otomatik yetkiler
  if (r === "ADMIN" || r === "MOD") {
    return true; // Admin ve Mod her şeye sahip
  }
  if (r === "VIP") {
    // VIP: gifAvatar + animatedCinema + animatedName
    return true;
  }
  if (r === "AJANS_SAHIBI" || r === "ASISTAN") {
    // Ajans sahipleri ve asistanlar da alabilir
    return perm === "gifAvatar" || perm === "animatedName";
  }

  // DB'deki manuel yetki
  if (!specialPerms) return false;
  const expired = specialPerms.expiresAt && new Date(specialPerms.expiresAt) <= new Date();
  if (expired) return false;
  return !!(specialPerms[perm]);
}
