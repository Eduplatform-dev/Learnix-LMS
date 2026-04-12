import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Switch } from "../../ui/switch";
import { Textarea } from "../../ui/textarea";
import { Separator } from "../../ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Settings, Bell, Lock, Globe, Mail, Database, CheckCircle } from "lucide-react";
import { getSettings, saveSettings } from "../../../services/adminService";

export function AdminSettings() {
  const [saving,    setSaving]    = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [saved,     setSaved]     = useState(false);
  const [general,   setGeneral]   = useState({ platformName: "Learnix", supportEmail: "", logoUrl: "" });
  const [notifs,    setNotifs]    = useState({ emailUpdates: true, productUpdates: false, billingAlerts: true });
  const [security,  setSecurity]  = useState({ enforceTwoFactor: false, allowGoogleLogin: true, sessionTimeout: "30" });
  const [locale,    setLocale]    = useState({ language: "en", timezone: "UTC", dateFormat: "MM/DD/YYYY" });
  const [emailConf, setEmailConf] = useState({ smtpHost: "", smtpPort: "587", smtpUser: "", fromName: "", fromEmail: "", footer: "" });
  const [backup,    setBackup]    = useState({ autoBackup: true, retentionDays: "30", backupWindow: "02:00-04:00" });

  useEffect(() => {
    getSettings().then((data) => {
      setGeneral(data.general);
      setNotifs(data.notifications);
      setSecurity(data.security);
      setLocale(data.localization);
      setEmailConf(data.emailConfig);
      setBackup(data.backup);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveSettings({ general, notifications: notifs, security, localization: locale, emailConfig: emailConf, backup });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { alert("Failed to save settings"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  const SectionCard = ({ title, icon: Icon, color, children }: any) => (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Icon className={`w-5 h-5 ${color}`} />{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );

  const Field = ({ label, children }: any) => <div className="space-y-1.5"><Label className="text-sm">{label}</Label>{children}</div>;
  const Toggle = ({ label, sub, checked, onChange }: any) => (
    <div>
      <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium text-gray-900">{label}</p>{sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}</div><Switch checked={checked} onCheckedChange={onChange} /></div>
      <Separator className="mt-4" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">System Settings</h1><p className="text-gray-500">Configure platform settings</p></div>
        <div className="flex items-center gap-3">
          {saved && <span className="flex items-center gap-1.5 text-green-600 text-sm"><CheckCircle className="w-4 h-4" />Saved!</span>}
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="General" icon={Settings} color="text-indigo-600">
          <Field label="Platform Name"><Input value={general.platformName} onChange={(e) => setGeneral((p) => ({ ...p, platformName: e.target.value }))} /></Field>
          <Field label="Support Email"><Input type="email" placeholder="support@example.com" value={general.supportEmail} onChange={(e) => setGeneral((p) => ({ ...p, supportEmail: e.target.value }))} /></Field>
          <Field label="Logo URL"><Input placeholder="https://..." value={general.logoUrl} onChange={(e) => setGeneral((p) => ({ ...p, logoUrl: e.target.value }))} /></Field>
        </SectionCard>

        <SectionCard title="Notifications" icon={Bell} color="text-amber-500">
          <Toggle label="Email Updates" sub="Send weekly learning summaries" checked={notifs.emailUpdates} onChange={(v: boolean) => setNotifs((p) => ({ ...p, emailUpdates: v }))} />
          <Toggle label="Product Updates" sub="Announce new features to users" checked={notifs.productUpdates} onChange={(v: boolean) => setNotifs((p) => ({ ...p, productUpdates: v }))} />
          <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium text-gray-900">Billing Alerts</p><p className="text-xs text-gray-500 mt-0.5">Notify admins about payments</p></div><Switch checked={notifs.billingAlerts} onCheckedChange={(v) => setNotifs((p) => ({ ...p, billingAlerts: v }))} /></div>
        </SectionCard>

        <SectionCard title="Security" icon={Lock} color="text-red-500">
          <Toggle label="Enforce 2FA" sub="Require two-factor authentication" checked={security.enforceTwoFactor} onChange={(v: boolean) => setSecurity((p) => ({ ...p, enforceTwoFactor: v }))} />
          <Toggle label="Allow Google Login" sub="Enable Google SSO for users" checked={security.allowGoogleLogin} onChange={(v: boolean) => setSecurity((p) => ({ ...p, allowGoogleLogin: v }))} />
          <Field label="Session Timeout (minutes)"><Input value={security.sessionTimeout} onChange={(e) => setSecurity((p) => ({ ...p, sessionTimeout: e.target.value }))} /></Field>
        </SectionCard>

        <SectionCard title="Localization" icon={Globe} color="text-green-500">
          <Field label="Language">
            <Select value={locale.language} onValueChange={(v) => setLocale((p) => ({ ...p, language: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="hi">Hindi</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Timezone">
            <Select value={locale.timezone} onValueChange={(v) => setLocale((p) => ({ ...p, timezone: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="UTC">UTC</SelectItem><SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem><SelectItem value="America/New_York">America/New_York</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Date Format">
            <Select value={locale.dateFormat} onValueChange={(v) => setLocale((p) => ({ ...p, dateFormat: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem><SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem><SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem></SelectContent>
            </Select>
          </Field>
        </SectionCard>

        <SectionCard title="Email Configuration" icon={Mail} color="text-blue-500">
          <div className="grid grid-cols-2 gap-3">
            <Field label="SMTP Host"><Input placeholder="smtp.example.com" value={emailConf.smtpHost} onChange={(e) => setEmailConf((p) => ({ ...p, smtpHost: e.target.value }))} /></Field>
            <Field label="SMTP Port"><Input value={emailConf.smtpPort} onChange={(e) => setEmailConf((p) => ({ ...p, smtpPort: e.target.value }))} /></Field>
          </div>
          <Field label="SMTP Username"><Input value={emailConf.smtpUser} onChange={(e) => setEmailConf((p) => ({ ...p, smtpUser: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From Name"><Input value={emailConf.fromName} onChange={(e) => setEmailConf((p) => ({ ...p, fromName: e.target.value }))} /></Field>
            <Field label="From Email"><Input type="email" value={emailConf.fromEmail} onChange={(e) => setEmailConf((p) => ({ ...p, fromEmail: e.target.value }))} /></Field>
          </div>
          <Field label="Footer"><Textarea rows={3} value={emailConf.footer} onChange={(e) => setEmailConf((p) => ({ ...p, footer: e.target.value }))} /></Field>
        </SectionCard>

        <SectionCard title="Backup" icon={Database} color="text-purple-500">
          <Toggle label="Automatic Backups" sub="Create daily backups automatically" checked={backup.autoBackup} onChange={(v: boolean) => setBackup((p) => ({ ...p, autoBackup: v }))} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Retention (days)"><Input value={backup.retentionDays} onChange={(e) => setBackup((p) => ({ ...p, retentionDays: e.target.value }))} /></Field>
            <Field label="Backup Window"><Input value={backup.backupWindow} onChange={(e) => setBackup((p) => ({ ...p, backupWindow: e.target.value }))} /></Field>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}