import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FaUser,
  FaLock,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

import {
  IoSunny,
  IoMoon,
} from "react-icons/io5";

import loginVideo from "../assets/login-timelapse.mp4";

import { translations } from "../constants/translations";
import { loginSchema } from "../schemas/loginSchema";
import type {
  LoginSchemaType,
} from "../schemas/loginSchema";
import { useLanguage } from "../hooks/useLanguage";
import { useTheme } from "../hooks/useTheme";

export default function LoginPage() {
  const navigate = useNavigate();

  const { language, changeLanguage } = useLanguage();

  const { darkMode, setDarkMode } = useTheme();

  const [showPassword, setShowPassword] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const t = translations[language];

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<LoginSchemaType>({
  resolver: zodResolver(loginSchema) as any,

  defaultValues: {
    username: "",
    password: "",
    rememberMe: false,
  },
});

const onSubmit = async (
  data: LoginSchemaType
): Promise<void> => {
  try {
    setIsLoading(true);

    await new Promise((resolve) =>
      setTimeout(resolve, 1500)
    );

    console.log(data);

  toast.success(
  "Welcome to KnowledgeFlow AI!"
  );
  
    navigate("/home");
  } catch (error) {
    console.error(error);
  } finally {
    setIsLoading(false);
  }
};
  const theme = darkMode
    ? {
        bg: "bg-[#0B1120]",

        card:
          "bg-[#111827]/90 backdrop-blur-xl",

        text: "text-white",

        subtext: "text-gray-400",

        border: "border-gray-700",

        input:
          "bg-[#1F2937]/50 border-gray-700 text-white placeholder:text-gray-500",

        icon: "text-gray-400",

        button:
          "bg-blue-600 hover:bg-blue-700",

        secondaryButton:
          "bg-gray-800 hover:bg-gray-700 text-white",
      }
    : {
        bg: "bg-gray-50",

        card:
          "bg-white/90 backdrop-blur-xl",

        text: "text-gray-900",

        subtext: "text-gray-500",

        border: "border-gray-200",

        input:
          "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400",

        icon: "text-gray-400",

        button:
          "bg-blue-600 hover:bg-blue-700",

        secondaryButton:
          "bg-gray-100 hover:bg-gray-200 text-gray-700",
      };

  const iconPosition =
    language === "fa"
      ? "right-4"
      : "left-4";

  const inputPadding =
    language === "fa"
      ? "pr-12 pl-4"
      : "pl-12 pr-4";

  return (
    <div
      dir={language === "fa" ? "rtl" : "ltr"}
      className={`min-h-screen flex ${theme.bg}`}
    >
      {/* VIDEO SECTION */}

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source
            src={loginVideo}
            type="video/mp4"
          />
        </video>

        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/20" />

        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <motion.div
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.8,
            }}
          >

          </motion.div>
        </div>
      </div>

      {/* LOGIN SECTION */}

      <motion.div
        initial={{
          opacity: 0,
          y: 30,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.6,
        }}
        className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-10"
      >
        {/* ACTION BUTTONS */}

        <div className="w-full max-w-md flex justify-end gap-3 mb-6">
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={() =>
              setDarkMode(!darkMode)
            }
            className={`p-3 rounded-xl transition ${theme.secondaryButton}`}
          >
            {darkMode ? (
              <IoSunny size={18} />
            ) : (
              <IoMoon size={18} />
            )}
          </button>

          <button
            type="button"
            aria-label="Change language"
            onClick={() =>
              changeLanguage(
                language === "en"
                  ? "fa"
                  : "en"
              )
            }
            className={`px-4 rounded-xl font-medium transition ${theme.secondaryButton}`}
          >
            {language === "en"
              ? "FA"
              : "EN"}
          </button>
        </div>

        {/* LOGIN CARD */}

        <div
          className={`w-full max-w-md p-8 rounded-3xl border shadow-2xl ${theme.card} ${theme.border}`}
        >
          <div className="mb-8 text-center">
            <h2
              className={`text-3xl font-bold ${theme.text}`}
            >
              {t.title}
            </h2>

            <p
              className={`mt-2 text-sm ${theme.subtext}`}
            >
              {t.subtitle}
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            {/* USERNAME */}

            <div>
              <label
                htmlFor="username"
                className={`mb-2 block text-sm font-medium ${theme.text}`}
              >
                {t.username}
              </label>

              <div className="relative">
                <FaUser
                  className={`absolute top-1/2 -translate-y-1/2 ${iconPosition} ${theme.icon}`}
                />

                <input
                  id="username"
                  type="text"
                  aria-label={t.username}
                  {...register("username")}
                  placeholder={t.username}
                  className={`
                    w-full
                    rounded-2xl
                    border
                    py-3.5
                    ${inputPadding}
                    transition
                    outline-none
                    focus:ring-2
                    focus:ring-blue-500
                    ${theme.input}
                  `}
                />
              </div>

              {errors.username && (
                <p className="mt-2 text-sm text-red-500">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* PASSWORD */}

            <div>
              <label
                htmlFor="password"
                className={`mb-2 block text-sm font-medium ${theme.text}`}
              >
                {t.password}
              </label>

              <div className="relative">
                <FaLock
                  className={`absolute top-1/2 -translate-y-1/2 ${iconPosition} ${theme.icon}`}
                />

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  aria-label={t.password}
                  {...register("password")}
                  placeholder={t.password}
                  className={`
                    w-full
                    rounded-2xl
                    border
                    py-3.5
                    ${
                      language === "fa"
                        ? "pr-12 pl-12"
                        : "pl-12 pr-12"
                    }
                    transition
                    outline-none
                    focus:ring-2
                    focus:ring-blue-500
                    ${theme.input}
                  `}
                />

                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className={`absolute top-1/2 -translate-y-1/2 ${
                    language === "fa"
                      ? "left-4"
                      : "right-4"
                  }`}
                >
                  {showPassword ? (
                    <FaEyeSlash
                      className={theme.icon}
                    />
                  ) : (
                    <FaEye
                      className={theme.icon}
                    />
                  )}
                </button>
              </div>

              {errors.password && (
                <p className="mt-2 text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* REMEMBER + FORGOT */}

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  {...register("rememberMe")}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />

                <span
                  className={`text-sm ${theme.subtext}`}
                >
                  {t.remember}
                </span>
              </label>

              <button
                type="button"
                className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
              >
                {t.forgot}
              </button>
            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={isLoading}
              className={`
                w-full
                rounded-2xl
                py-3.5
                font-semibold
                text-white
                transition
                active:scale-[0.98]
                disabled:cursor-not-allowed
                disabled:opacity-70
                ${theme.button}
              `}
            >
              {isLoading
                ? t.loading
                : t.login}
            </button>
          </form>

          {/* FOOTER */}

          <div
            className={`mt-8 border-t pt-6 text-center text-xs ${theme.border} ${theme.subtext}`}
          >
            © 2025 KnowledgeFlow AI
          </div>
        </div>
      </motion.div>
    </div>
  );
}