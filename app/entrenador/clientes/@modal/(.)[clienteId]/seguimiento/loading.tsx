export default function CargandoSeguimiento() {
  return (
    <div
      className="
        fixed inset-0 z-[100]
        flex items-center justify-center
        bg-slate-950/75
        p-4
        backdrop-blur-sm
      "
      role="status"
      aria-live="polite"
      aria-label="Cargando seguimiento del cliente"
    >
      <div
        className="
          w-full max-w-lg
          rounded-3xl
          border border-cyan-400/20
          bg-[#14243b]
          p-8
          text-center
          shadow-2xl
        "
      >
        {/* ANIMACIÓN DE CARGA */}
        <div className="flex justify-center">
          <div
            className="
              h-12 w-12
              animate-spin
              rounded-full
              border-4 border-cyan-400/20
              border-t-cyan-400
            "
          />
        </div>

        {/* TÍTULO */}
        <h2
          className="
            mt-6
            text-xl font-bold
            text-white
          "
        >
          Preparando seguimiento
        </h2>

        {/* DESCRIPCIÓN */}
        <p
          className="
            mt-3
            text-sm
            leading-6
            text-slate-400
          "
        >
          Estamos consultando los datos del cliente,
          su plan de entrenamiento y la información
          disponible para el entrenador.
        </p>

        {/* INDICADOR VISUAL */}
        <div
          className="
            mt-6 h-2
            overflow-hidden
            rounded-full
            bg-white/10
          "
        >
          <div
            className="
              h-full w-1/3
              animate-pulse
              rounded-full
              bg-gradient-to-r
              from-cyan-400
              to-teal-400
            "
          />
        </div>
      </div>
    </div>
  );
}