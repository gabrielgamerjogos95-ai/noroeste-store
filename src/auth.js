export function requireAdmin(req, res, next) {
  if (req.session?.admin) return next();
  return res.redirect('/admin/login');
}
