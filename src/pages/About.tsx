import { Layout } from "@/components/layout/Layout";

const About = () => {
  return (
    <Layout>
      <div className="container py-8 sm:py-12 max-w-3xl">
        <h1 className="text-2xl sm:text-3xl mb-6">About</h1>
        <div className="prose-clinical space-y-4">
          <p>
            MEDINEX is an educational platform designed to help clinicians 
            and medical learners understand human physiology as dynamic, interacting systems.
          </p>
          <p>
            We believe that critical care decisions require systems-level thinking, 
            not memorized facts. Our interactive models demonstrate how cardiovascular, 
            renal, and immune systems interact in real-time.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default About;
