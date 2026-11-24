import SmoothScroll from "@/components/SmoothScroll";
import Reveal from "@/components/Reveal";
import Nav from "@/components/Nav";
import Sequence from "@/components/Sequence";
import Finale from "@/components/Finale";
import { Statement, Why, Ways, Faq } from "@/components/Sections";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Reveal />
      <Nav />
      <main>
        <Sequence>
          <Statement />
          <Why />
          <Ways />
          <Faq />
          <Finale />
        </Sequence>
      </main>
    </>
  );
}
