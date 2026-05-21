import { useState } from "react";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { IoSunny, IoMoon } from "react-icons/io5";
import { motion } from "framer-motion";



export default function LoginPage() {
  const [lang, setLang] = useState("en");
  const [darkMode, setDarkMode] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const t = {
    en: {
      title: "Welcome Back",
      subtitle: "Sign in to your account",
      username: "Username",
      password: "Password",
      login: "Sign in",
      forgot: "Forgot password?",
      remember: "Remember me",
    },
    fa: {
      title: "خوش آمدید",
      subtitle: "وارد حساب کاربری خود شوید",
      username: "نام کاربری",
      password: "رمز عبور",
      login: "ورود",
      forgot: "فراموشی رمز؟",
      remember: "مرا به خاطر بسپار",
    },
  };

  const theme = darkMode
    ? {
        bg: "bg-[#0B1120]",
        card: "bg-[#1C2534]/90 backdrop-blur-xl",
        text: "text-white",
        subtext: "text-gray-400",
        border: "border-gray-700",
        icon: "text-gray-400",
      }
    : {
        bg: "bg-gray-50",
        card: "bg-white/90 backdrop-blur-lg",
        text: "text-gray-900",
        subtext: "text-gray-600",
        border: "border-gray-300",
        icon: "text-gray-500",
      };

  return (
    <div
      dir={lang === "fa" ? "rtl" : "ltr"}
      className={`h-screen flex ${theme.bg}`}
    >
{/* Left Side Image */}
<div className="hidden md:flex w-1/2 h-full relative">
  <div
    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
    style={{
      backgroundImage: "url('/assets/login-bg.png')",
    }}
  />
  <div className="absolute inset-0 bg-black/30" />
</div>


      {/* RIGHT SIDE */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex w-1/2 flex-col items-center justify-center px-6 py-10"
      >
        {/* ACTION BUTTONS */}
        <div className="w-full max-w-md flex justify-end gap-3 mb-6">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition"
          >
            {darkMode ? <IoSunny size={18} /> : <IoMoon size={18} />}
          </button>
          <button
            onClick={() => setLang(lang === "en" ? "fa" : "en")}
            className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition"
          >
            {lang === "en" ? "FA" : "EN"}
          </button>
        </div>

        {/* LOGIN CARD */}
        <div
          className={`w-full max-w-md p-8 rounded-2xl shadow-xl border ${theme.card} ${theme.border}`}
        >
          <h2 className={`text-3xl font-bold mb-2 text-center ${theme.text}`}>
            {t[lang].title}
          </h2>
          <p className={`text-center mb-8 text-sm ${theme.subtext}`}>
            {t[lang].subtitle}
          </p>

          <form className="space-y-5">
            {/* USERNAME */}
            <div className="relative">
              <FaUser className={`absolute left-3 top-3 ${theme.icon}`} />
              <input
                type="text"
                placeholder={t[lang].username}
                className={`w-full py-3 pl-10 pr-3 border ${theme.border} rounded-xl bg-transparent
                  ${theme.text} placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none`}
              />
            </div>

            {/* PASSWORD */}
            <div className="relative">
              <FaLock className={`absolute left-3 top-3 ${theme.icon}`} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t[lang].password}
                className={`w-full py-3 pl-10 pr-10 border ${theme.border} rounded-xl bg-transparent
                  ${theme.text} placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3"
              >
                {showPassword ? (
                  <FaEyeSlash className={theme.icon} />
                ) : (
                  <FaEye className={theme.icon} />
                )}
              </button>
            </div>

            {/* REMEMBER + FORGOT */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-blue-600 cursor-pointer hover:text-blue-700 transition">
                {t[lang].forgot}
              </span>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                />
                <span className={`${theme.subtext}`}>{t[lang].remember}</span>
              </label>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition active:scale-[0.98]"
            >
              {t[lang].login}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
