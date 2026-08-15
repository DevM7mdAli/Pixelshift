import Link from "next/link";
import {
  ArrowRight,
  Braces,
  Check,
  Download,
  FileImage,
  Layers3,
  LockKeyhole,
  PackageCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { ConverterDemo } from "@/components/converter-demo";
import { Float, Reveal } from "@/components/reveal";

const frameworks = ["Vanilla", "React", "Angular", "Vue"];
const pipelineDotMotion = [
  "motion-safe:animate-pulse [animation-duration:1.8s]",
  "motion-safe:animate-pulse [animation-delay:220ms] [animation-duration:1.8s]",
  "motion-safe:animate-pulse [animation-delay:440ms] [animation-duration:1.8s]",
];
const sectionWidth =
  "mx-auto min-w-0 w-[min(1240px,calc(100%-40px))] max-[700px]:w-[min(1240px,calc(100%-24px))]";
const overline = "text-[0.7rem] font-[760] tracking-[0.14em] uppercase";
const button =
  "group inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-pixel-ink px-[1.2rem] py-3 text-[0.86rem] font-[720] no-underline transition-[transform,box-shadow,background] duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none max-[430px]:w-full";
const sectionHeading =
  "m-0 max-w-195 font-pixel-serif text-[clamp(2.7rem,5vw,5rem)] font-normal leading-[0.98] tracking-[-0.055em] max-[430px]:text-[2.35rem] max-[430px]:leading-[1.02]";
const featureCard =
  "relative min-h-82.5 min-w-0 border-r border-b border-pixel-ink p-[clamp(1.5rem,3vw,2.8rem)] max-[430px]:min-h-0 max-[430px]:p-5";
const featureIcon =
  "mb-[3.2rem] grid size-11 place-items-center rounded-full border border-current max-[430px]:mb-8";
const featureIndex =
  "absolute top-[2.8rem] right-[2.8rem] opacity-60 max-[430px]:top-5 max-[430px]:right-5";
const featureTitle =
  "mb-3 max-w-155 font-pixel-serif text-[clamp(1.75rem,3vw,2.7rem)] font-normal tracking-[-0.045em]";
const featureCopy = "m-0 max-w-155 leading-[1.65]";

export default function LandingPage() {
  return (
    <main className="overflow-hidden bg-pixel-paper bg-[linear-gradient(var(--pixelshift-page-grid)_1px,transparent_1px)] bg-size-[100%_44px] font-pixel-sans text-pixel-ink">
      <section
        className={`${sectionWidth} grid min-h-190 grid-cols-[minmax(0,1.03fr)_minmax(420px,0.97fr)] items-center gap-[clamp(3rem,8vw,8rem)] pt-22.5 pb-21 max-[980px]:grid-cols-1 max-[700px]:min-h-0 max-[700px]:gap-12 max-[700px]:py-12`}
      >
        <Reveal className="relative z-2" eager>
          <div
            className={`${overline} mb-[2.2rem] flex max-w-110 items-center gap-[0.9rem]`}
          >
            <span>Open source</span>
            <span className="h-px flex-1 bg-pixel-ink" />
            <span>Runs locally</span>
          </div>
          <h1 className="m-0 max-w-180 font-pixel-serif text-[clamp(4.6rem,8.2vw,8.2rem)] leading-[0.82] font-normal tracking-[-0.075em] max-[700px]:text-[clamp(2.8rem,15vw,4.5rem)] max-[700px]:leading-[0.88] max-[700px]:tracking-[-0.065em]">
            Every image.
            <br />
            <em className="inline-block pr-[0.08em] font-normal text-pixel-orange">
              One element.
            </em>
          </h1>
          <p className="mt-[2.4rem] max-w-152.5 text-[clamp(1.05rem,1.6vw,1.28rem)] leading-[1.62] tracking-[-0.02em]">
            A small, framework-friendly image converter that turns PNG, JPEG,
            WebP, GIF, and BMP files into production-ready assets—without an
            upload server.
          </p>
          <div className="mt-[2.1rem] flex flex-wrap gap-[0.8rem] max-[430px]:grid max-[430px]:grid-cols-1">
            <a
              className={`${button} bg-pixel-lime text-pixel-mark shadow-[4px_4px_0] shadow-pixel-ink hover:shadow-[6px_6px_0]`}
              href="#demo"
            >
              Try the component
              <ArrowRight
                className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none"
                size={17}
              />
            </a>
            <Link
              className={`${button} bg-transparent text-pixel-ink hover:bg-pixel-paper-bright`}
              href="/docs"
            >
              Read the docs
            </Link>
          </div>
          <div
            className="mt-[2.4rem] flex w-fit min-w-0 max-w-full items-center gap-[0.7rem] overflow-x-auto rounded-md border border-pixel-line bg-white/36 px-4 py-[0.8rem] font-pixel-mono text-xs max-[430px]:w-full"
            aria-label="Install command"
          >
            <span className="font-extrabold text-pixel-orange">$</span>
            <code className="whitespace-nowrap">pnpm add pixelshift-react</code>
          </div>
        </Reveal>

        <Reveal
          className="relative isolate min-h-142.5 min-w-0 overflow-hidden rounded-[4px_64px_4px_4px] bg-pixel-mark text-pixel-mark-inverse shadow-[24px_24px_0] shadow-pixel-ink/10 max-[980px]:min-h-130 max-[700px]:min-h-110 max-[700px]:rounded-[3px_38px_3px_3px] max-[700px]:shadow-[10px_10px_0] max-[430px]:min-h-105"
          delay={120}
          direction="right"
          eager
          aria-label="Image conversion architecture"
        >
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(var(--pixelshift-board-grid)_1px,transparent_1px),linear-gradient(90deg,var(--pixelshift-board-grid)_1px,transparent_1px)] opacity-[0.16] bg-size-[42px_42px] after:absolute after:top-[34%] after:left-[44%] after:size-87.5 after:rounded-full after:bg-pixel-orange after:opacity-[0.28] after:blur-[115px] after:content-['']" />
          <div
            className={`${overline} flex justify-between gap-4 border-b border-white/15 px-[1.7rem] py-6 text-white/62 max-[430px]:px-4 max-[430px]:py-5 max-[430px]:text-[0.62rem]`}
          >
            <span>CONVERSION PIPELINE</span>
            <span>v0.1</span>
          </div>
          <Float
            className="absolute top-[20%] right-[8%] grid size-13.5 place-items-center rounded-full border border-white/[0.28] text-[0.63rem] font-extrabold tracking-[0.08em] max-[430px]:top-[18%] max-[430px]:right-[5%] max-[430px]:size-11"
            drift={8}
            duration={4800}
            lift={12}
          >
            PNG
          </Float>
          <Float
            className="absolute top-[40%] right-[3%] grid size-10.75 place-items-center rounded-full border border-white/[0.28] text-[0.63rem] font-extrabold tracking-[0.08em] max-[430px]:top-[43%] max-[430px]:right-[3%] max-[430px]:size-9.5"
            delay={-1400}
            drift={-7}
            duration={5600}
            lift={10}
          >
            GIF
          </Float>
          <Float
            className="absolute right-[16%] bottom-[20%] grid size-11.75 place-items-center rounded-full border border-white/[0.28] text-[0.63rem] font-extrabold tracking-[0.08em] max-[430px]:right-[4%] max-[430px]:bottom-[31%] max-[430px]:size-10"
            delay={-2800}
            drift={6}
            duration={6200}
            lift={9}
          >
            BMP
          </Float>
          <div className="absolute top-[29%] left-[12%] flex w-[64%] min-w-0 items-center gap-4 border border-white/22 bg-white/8 p-[1.1rem] backdrop-blur-[10px] transition-transform duration-500 hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none max-[700px]:top-[26%] max-[700px]:left-[6%] max-[700px]:w-[82%] max-[700px]:gap-3 max-[700px]:p-3">
            <div className="grid size-15.5 shrink-0 place-items-center bg-pixel-lime text-pixel-mark max-[430px]:size-13">
              <FileImage size={30} strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <span
                className={`${overline} mb-[0.4rem] block text-white/[0.55]`}
              >
                01 / DECODE
              </span>
              <strong className="block font-pixel-serif text-[1.45rem] leading-tight font-normal max-[430px]:text-[1.2rem]">
                Browser canvas
              </strong>
            </div>
          </div>
          <div className="absolute top-[calc(29%+88px)] left-[calc(12%+30px)] grid h-27 content-between before:absolute before:inset-y-0 before:left-0.75 before:w-px before:bg-white/36 before:content-[''] max-[700px]:top-[calc(26%+76px)] max-[700px]:left-[calc(6%+25px)] max-[700px]:h-21.5">
            {pipelineDotMotion.map((motionClass, step) => (
              <i
                className={`z-1 size-1.75 rounded-full bg-pixel-lime ${motionClass}`}
                key={step}
              />
            ))}
          </div>
          <div className="absolute bottom-[15%] left-[12%] grid w-[48%] bg-pixel-mark-inverse px-[1.35rem] py-[1.2rem] text-pixel-mark shadow-[10px_10px_0] shadow-pixel-orange transition-transform duration-500 hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none max-[700px]:bottom-[16%] max-[700px]:left-[6%] max-[700px]:w-[66%] max-[700px]:px-4 max-[700px]:py-4 max-[430px]:shadow-[7px_7px_0]">
            <span className={`${overline} mb-[0.2rem] text-pixel-mark/70`}>
              OUTPUT
            </span>
            <strong className="font-pixel-serif text-[2.8rem] leading-none font-normal tracking-[-0.06em] max-[430px]:text-[2.2rem]">
              WEBP
            </strong>
            <small className="mt-2 font-pixel-mono">quality · 85%</small>
          </div>
          <div className="absolute right-[1.7rem] bottom-[1.4rem] flex items-center gap-[0.45rem] text-[0.7rem] text-white/[0.58] max-[430px]:right-4 max-[430px]:bottom-3 max-[430px]:text-[0.61rem]">
            <LockKeyhole size={15} />0 bytes leave your device
          </div>
        </Reveal>
      </section>

      <Reveal className={sectionWidth}>
        <section
          className="grid min-h-23 grid-cols-[1.5fr_repeat(4,minmax(0,1fr))] items-center border-y border-pixel-ink max-[980px]:grid-cols-4 max-[700px]:grid-cols-2"
          aria-label="Supported frameworks"
        >
          <span className={`${overline} max-[980px]:hidden`}>
            ONE API / FOUR ADAPTERS
          </span>
          {frameworks.map((framework) => (
            <span
              className="group flex min-h-23 items-center justify-center gap-[0.55rem] border-l border-pixel-line font-pixel-serif text-[1.05rem] transition-colors duration-200 hover:bg-pixel-paper-bright motion-reduce:transition-none max-[700px]:min-h-15.5 max-[700px]:border-b max-[700px]:text-[0.92rem]"
              key={framework}
            >
              <Check
                className="text-pixel-orange transition-transform duration-200 group-hover:scale-125 motion-reduce:transform-none motion-reduce:transition-none"
                size={15}
              />
              {framework}
            </span>
          ))}
        </section>
      </Reveal>

      <section
        className={`${sectionWidth} py-32.5 max-[700px]:py-18`}
        id="demo"
      >
        <Reveal className="mb-[3.2rem] grid grid-cols-[64px_minmax(360px,1.2fr)_minmax(280px,0.8fr)] items-start gap-6 max-[980px]:grid-cols-[56px_1fr] max-[700px]:grid-cols-1">
          <span className="grid size-11.5 place-items-center rounded-full border border-pixel-ink font-pixel-mono text-[0.72rem]">
            01
          </span>
          <div>
            <p className={`${overline} mb-[0.8rem] text-pixel-orange`}>
              Live playground
            </p>
            <h2 className={sectionHeading}>
              Drop an image. Keep your privacy.
            </h2>
          </div>
          <p className="mt-[2.1rem] text-[0.98rem] leading-[1.7] text-pixel-muted max-[980px]:col-start-2 max-[980px]:mt-0 max-[700px]:col-start-1">
            This is the React wrapper running in the page. Choose a format,
            resize if needed, and download the result. Nothing is sent to a
            backend.
          </p>
        </Reveal>
        <Reveal delay={120}>
          <ConverterDemo />
        </Reveal>
      </section>

      <section
        className={`${sectionWidth} border-t border-pixel-line py-32.5 max-[700px]:py-18`}
      >
        <Reveal className="mb-[3.2rem] grid grid-cols-[64px_1fr] items-start gap-6 max-[700px]:grid-cols-1">
          <span className="grid size-11.5 place-items-center rounded-full border border-pixel-ink font-pixel-mono text-[0.72rem]">
            02
          </span>
          <div>
            <p className={`${overline} mb-[0.8rem] text-pixel-orange`}>
              Designed as a library
            </p>
            <h2 className={sectionHeading}>
              Small surface. Serious internals.
            </h2>
          </div>
        </Reveal>
        <div className="grid grid-cols-2 border-t border-l border-pixel-ink max-[700px]:grid-cols-1">
          <article
            className={`${featureCard} col-span-2 bg-pixel-lime text-pixel-mark max-[700px]:col-span-1`}
          >
            <Reveal>
              <div className={featureIcon}>
                <Layers3 size={22} />
              </div>
              <span className={`${overline} ${featureIndex}`}>A / 01</span>
              <h3 className={featureTitle}>Logic once. Adapters only.</h3>
              <p className={`${featureCopy} text-pixel-mark/75`}>
                Conversion lives in the framework-free core. Lit owns the UI;
                React, Angular, and Vue simply translate their native APIs.
              </p>
              <div className="mt-10 flex items-center gap-[0.8rem] font-pixel-mono text-[0.73rem] max-[700px]:flex-wrap max-[430px]:flex-col max-[430px]:items-start max-[430px]:gap-2">
                <span className="border border-pixel-mark bg-white/40 px-3 py-[0.55rem]">
                  core
                </span>
                <ArrowRight className="max-[430px]:rotate-90" size={16} />
                <span className="border border-pixel-mark bg-white/40 px-3 py-[0.55rem]">
                  web-core
                </span>
                <ArrowRight className="max-[430px]:rotate-90" size={16} />
                <span className="border border-pixel-mark bg-white/40 px-3 py-[0.55rem]">
                  your app
                </span>
              </div>
            </Reveal>
          </article>

          <article
            className={`${featureCard} bg-pixel-mark text-pixel-mark-inverse`}
          >
            <Reveal>
              <div className={featureIcon}>
                <Zap size={22} />
              </div>
              <span className={`${overline} ${featureIndex}`}>A / 02</span>
              <h3 className={featureTitle}>Zero round trips</h3>
              <p className={`${featureCopy} text-pixel-mark-inverse/75`}>
                Canvas encoding keeps conversion quick, private, and
                offline-ready.
              </p>
            </Reveal>
          </article>

          <article className={`${featureCard} bg-pixel-paper-bright`}>
            <Reveal delay={100}>
              <div className={featureIcon}>
                <Braces size={22} />
              </div>
              <span className={`${overline} ${featureIndex}`}>A / 03</span>
              <h3 className={featureTitle}>Typed from edge to edge</h3>
              <p className={`${featureCopy} text-pixel-muted`}>
                Properties, methods, results, and events ship with TypeScript
                declarations.
              </p>
            </Reveal>
          </article>

          <article
            className={`${featureCard} col-span-2 grid grid-cols-[minmax(240px,0.75fr)_minmax(360px,1.25fr)] gap-12 bg-pixel-paper-bright max-[700px]:col-span-1 max-[700px]:grid-cols-1 max-[430px]:gap-8`}
          >
            <Reveal>
              <div className={featureIcon}>
                <PackageCheck size={22} />
              </div>
              <span className={`${overline} ${featureIndex}`}>A / 04</span>
              <h3 className={featureTitle}>A two-line integration</h3>
              <p className={`${featureCopy} text-pixel-muted`}>
                Import once, then render a typed component in your React app.
              </p>
            </Reveal>
            <Reveal className="min-w-0" delay={120}>
              <pre
                className="m-0 flex min-h-55 w-full max-w-full items-center overflow-x-auto rounded-[2px_42px_2px_2px] bg-pixel-mark p-8 text-[clamp(0.68rem,1.4vw,0.92rem)] leading-[1.8] text-pixel-mark-inverse max-[430px]:min-h-47.5 max-[430px]:rounded-[2px_28px_2px_2px] max-[430px]:p-5"
                aria-label="React component example"
              >
                <code>
                  <span className="text-pixel-lime">import</span>{" "}
                  {`{ ImageConverter }`}{" "}
                  <span className="text-pixel-lime">from</span>{" "}
                  &quot;pixelshift-react&quot;;
                  {"\n\n"}
                  &lt;ImageConverter format=&quot;webp&quot; multiple /&gt;
                </code>
              </pre>
            </Reveal>
          </article>
        </div>
      </section>

      <section
        className={`${sectionWidth} relative mb-10 overflow-hidden rounded-[68px_4px_4px] bg-pixel-orange px-10 pt-27.5 pb-9.5 text-center text-pixel-surface before:absolute before:inset-x-9.5 before:top-18.5 before:h-px before:bg-white/35 before:content-[''] max-[700px]:rounded-[42px_3px_3px] max-[700px]:px-5 max-[700px]:pt-22 max-[700px]:pb-7 max-[430px]:px-4`}
      >
        <Reveal>
          <div
            className="absolute top-25 right-[8%] rotate-12 max-[700px]:top-18 max-[700px]:right-[6%] max-[700px]:opacity-40"
            aria-hidden="true"
          >
            <Float drift={14} duration={5400} lift={20}>
              <Sparkles
                className="size-11.5 max-[430px]:size-8"
                strokeWidth={1.4}
              />
            </Float>
          </div>
          <p className={`${overline} mb-[0.8rem] text-pixel-mark`}>
            Your images, your browser
          </p>
          <h2 className="mx-auto max-w-225 font-pixel-serif text-[clamp(3rem,6.5vw,6.7rem)] leading-[0.98] font-normal tracking-[-0.055em] max-[430px]:text-[2.35rem] max-[430px]:leading-none">
            Ship image conversion without shipping a server.
          </h2>
          <div className="mt-[2.1rem] flex flex-wrap justify-center gap-[0.8rem] max-[430px]:grid max-[430px]:grid-cols-1">
            <Link
              className={`${button} bg-pixel-surface text-pixel-ink`}
              href="/docs/getting-started"
            >
              Start building
              <ArrowRight
                className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none"
                size={17}
              />
            </Link>
            <Link
              className={`${button} border-pixel-mark text-pixel-mark hover:bg-white/20`}
              href="/docs/api"
            >
              Explore the API
            </Link>
          </div>
          <div className="mt-22.5 grid grid-cols-3 items-center border-t border-white/35 pt-6 text-[0.65rem] font-[760] tracking-widest max-[700px]:mt-17.5 max-[700px]:grid-cols-1 max-[700px]:gap-[0.8rem]">
            <span className="flex items-center gap-[0.4rem] justify-self-start max-[700px]:justify-self-center">
              <Download size={14} /> PNG · JPEG · WEBP
            </span>
            <span>MIT LICENSE</span>
            <span className="justify-self-end max-[700px]:justify-self-center">
              BUILT WITH LIT
            </span>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
