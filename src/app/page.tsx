import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPostLoginRedirect } from "@/lib/user-redirect";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Box,
  Check,
  CircleCheck,
  Clock3,
  FileCheck2,
  HardDrive,
  Laptop,
  Leaf,
  LockKeyhole,
  MapPin,
  Monitor,
  Recycle,
  ScanLine,
  Server,
  ShieldCheck,
  Truck,
} from "lucide-react";
import LandingMotionControl, { LandingScene } from "./landing-motion-control";
import styles from "./landing-page.module.css";

export const metadata: Metadata = {
  title: "RecyTrack | IT Asset Disposition & Recycling",
  description:
    "Manage IT asset collections, data sanitisation, asset recovery and recycling with connected lifecycle tracking.",
};

const platformFeatures = [
  {
    icon: Truck,
    eyebrow: "COLLECTIONS",
    title: "Plan collections around your operation.",
    description:
      "Request collections, choose a site and follow progress through the collection workflow.",
    className: styles.featureCollection,
    visual: "collection",
  },
  {
    icon: ScanLine,
    eyebrow: "ASSET LIFECYCLE",
    title: "Know what happens to every asset.",
    description:
      "Follow registered assets through inspection, processing and final disposition.",
    className: styles.featureLifecycle,
    visual: "lifecycle",
  },
  {
    icon: LockKeyhole,
    eyebrow: "DATA SECURITY",
    title: "Track sanitisation and destruction.",
    description:
      "Record data-bearing media processing, evidence and certificate eligibility.",
    className: styles.featureSecurity,
    visual: "security",
  },
  {
    icon: BadgeCheck,
    eyebrow: "CUSTODY & CERTIFICATES",
    title: "Keep the handovers and records connected.",
    description:
      "Trace custody events and access issued certificates from the customer portal.",
    className: styles.featureCustody,
    visual: "custody",
  },
  {
    icon: MapPin,
    eyebrow: "CUSTOMER SELF-SERVICE",
    title: "Manage work across customer sites.",
    description:
      "Give customer users a place to manage collections, assets, sites and certificates.",
    className: styles.featureSites,
    visual: "sites",
  },
  {
    icon: Recycle,
    eyebrow: "COMMERCIAL OPERATIONS",
    title: "Connect disposition with recovery operations.",
    description:
      "Support reuse, resale and recycling decisions with operational and commercial records.",
    className: styles.featureRecovery,
    visual: "recovery",
  },
];

const journeySteps = [
  {
    icon: Clock3,
    title: "Book a collection",
    description: "Request a collection and choose the customer site.",
  },
  {
    icon: Truck,
    title: "Move with custody",
    description: "Document collection and asset handovers along the way.",
  },
  {
    icon: ScanLine,
    title: "Register each asset",
    description: "Record asset details and track its lifecycle status.",
  },
  {
    icon: ShieldCheck,
    title: "Process data-bearing media",
    description: "Record sanitisation or physical destruction activity.",
  },
  {
    icon: Recycle,
    title: "Choose an outcome",
    description: "Route assets for reuse, recovery, return or recycling.",
  },
  {
    icon: FileCheck2,
    title: "Issue records",
    description: "Make eligible certificates and reporting available.",
  },
];

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`${styles.brand} ${inverse ? styles.brandInverse : ""}`}>
      <span className={styles.brandIcon} aria-hidden="true">
        <Recycle size={19} strokeWidth={2.2} />
      </span>
      <span>
        Recy<span className={styles.brandAccent}>Track</span>
      </span>
    </span>
  );
}

function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link className={styles.primaryButton} href={href}>
      {children}
      <ArrowRight size={17} aria-hidden="true" />
    </Link>
  );
}

export default async function LandingPage() {
  const session = await auth();

  if (session?.user?.id) {
    const redirectPath = await getPostLoginRedirect(session.user.id);
    redirect(redirectPath);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.navShell}>
          <Link className={styles.brandLink} href="/" aria-label="RecyTrack home">
            <BrandMark />
          </Link>
          <nav className={styles.desktopNav} aria-label="Main navigation">
            <a href="#platform">Platform</a>
            <a href="#solutions">Solutions</a>
            <a href="#journey">How it works</a>
            <a href="#security">Security</a>
            <Link href="/login">Customer portal</Link>
          </nav>
          <div className={styles.navActions}>
            <Link className={styles.signInLink} href="/login">
              Sign in
            </Link>
            <Link className={styles.navCta} href="/register">
              Get started <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <details className={styles.mobileMenu}>
            <summary aria-label="Toggle navigation menu">
              <span className={styles.menuBars} aria-hidden="true" />
            </summary>
            <nav aria-label="Mobile navigation">
              <a href="#platform">Platform</a>
              <a href="#solutions">Solutions</a>
              <a href="#journey">How it works</a>
              <a href="#security">Security &amp; compliance</a>
              <Link href="/login">Customer portal / Sign in</Link>
              <Link className={styles.mobileCta} href="/register">
                Create customer account <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </nav>
          </details>
        </div>
      </header>

      <section className={styles.hero} id="solutions">
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              THE INTELLIGENT ITAD PLATFORM
            </div>
            <h1>
              Secure IT assets.
              <br />
              Smarter recycling.
              <br />
              <span>Complete visibility.</span>
            </h1>
            <p className={styles.heroIntro}>
              Manage the entire IT asset lifecycle, from collection and secure
              data sanitisation to responsible recycling, asset recovery and
              auditable compliance.
            </p>
            <div className={styles.heroActions}>
              <PrimaryLink href="/register">Create customer account</PrimaryLink>
              <a className={styles.secondaryButton} href="#platform">
                Explore the platform <ArrowDown size={16} aria-hidden="true" />
              </a>
            </div>
            <Link className={styles.portalLink} href="/login">
              <LockKeyhole size={15} aria-hidden="true" />
              Sign in to your customer portal
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <div className={styles.heroProof} aria-label="Platform capabilities">
              <span><Check size={14} /> Asset lifecycle</span>
              <span><Check size={14} /> Secure processing</span>
              <span><Check size={14} /> Traceable records</span>
            </div>
          </div>

          <div className={styles.heroVisual} role="group" aria-label="Illustration of connected IT assets moving through a recycling lifecycle">
            <div className={styles.visualTopline}>
              <span><span className={styles.liveDot} /> LIFECYCLE OVERVIEW</span>
              <span>RECYTRACK PLATFORM</span>
            </div>
            <LandingScene className={styles.scene}>
              <div className={`${styles.sceneOrbit} ${styles.sceneOrbitOuter}`} />
              <div className={`${styles.sceneOrbit} ${styles.sceneOrbitInner}`} />
              <div className={`${styles.sceneOrbit} ${styles.sceneOrbitDashed}`} />
              <span className={`${styles.orbitNode} ${styles.orbitNodeOne}`} />
              <span className={`${styles.orbitNode} ${styles.orbitNodeTwo}`} />
              <span className={`${styles.orbitNode} ${styles.orbitNodeThree}`} />
              <div className={styles.cycleCore}>
                <span className={styles.cycleIcon}><Recycle size={47} strokeWidth={1.6} /></span>
                <span className={styles.coreCaption}>CIRCULAR<br />ASSET FLOW</span>
              </div>
              <div className={`${styles.assetTile} ${styles.assetLaptop}`}>
                <Laptop size={25} strokeWidth={1.6} />
                <span>LAPTOP</span>
              </div>
              <div className={`${styles.assetTile} ${styles.assetMonitor}`}>
                <Monitor size={24} strokeWidth={1.6} />
                <span>DISPLAY</span>
              </div>
              <div className={`${styles.assetTile} ${styles.assetServer}`}>
                <Server size={23} strokeWidth={1.6} />
                <span>SERVER</span>
              </div>
              <div className={`${styles.assetTile} ${styles.assetDrive}`}>
                <HardDrive size={23} strokeWidth={1.6} />
                <span>STORAGE</span>
              </div>
              <div className={styles.sceneShield}><ShieldCheck size={18} /><span>SECURE<br />PROCESSING</span></div>
              <div className={styles.sceneCertificate}><FileCheck2 size={18} /><span>TRACEABLE<br />RECORDS</span></div>
              <span className={`${styles.dataParticle} ${styles.particleOne}`} />
              <span className={`${styles.dataParticle} ${styles.particleTwo}`} />
              <span className={`${styles.dataParticle} ${styles.particleThree}`} />
            </LandingScene>
            <div className={styles.visualFooter}>
              <span><span className={styles.footerLine} /> Collection <b>→</b> Tracking <b>→</b> Processing</span>
              <LandingMotionControl className={styles.motionControl} />
            </div>
          </div>
        </div>
        <div className={styles.heroBottom}>
          <span>ONE CONNECTED WORKFLOW</span>
          <span className={styles.heroBottomRule} />
          <span>From collection to documented outcome</span>
        </div>
      </section>

      <section className={styles.platformSection} id="platform">
        <div className={styles.sectionShell}>
          <div className={styles.sectionIntro}>
            <div>
              <p className={styles.sectionKicker}>THE PLATFORM</p>
              <h2>Every handover.<br /><span>One connected view.</span></h2>
            </div>
            <p>
              Practical tools for collection planning, asset processing and
              customer visibility—connected across the full disposition journey.
            </p>
          </div>

          <div className={styles.bentoGrid}>
            {platformFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <article className={`${styles.featureCard} ${feature.className}`} key={feature.title}>
                  <div className={styles.featureHeader}>
                    <span className={styles.featureIcon}><Icon size={18} /></span>
                    <span className={styles.featureEyebrow}>{feature.eyebrow}</span>
                    <ArrowUpRight className={styles.featureArrow} size={16} aria-hidden="true" />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  {feature.visual === "collection" && (
                    <div className={styles.collectionVisual} aria-hidden="true">
                      <div className={styles.collectionMap}>
                        <span className={`${styles.mapPin} ${styles.mapPinA}`} />
                        <span className={`${styles.mapPin} ${styles.mapPinB}`} />
                        <span className={`${styles.mapPin} ${styles.mapPinC}`} />
                        <svg viewBox="0 0 300 92" preserveAspectRatio="none">
                          <path d="M22 66 C75 68 67 22 128 34 S186 76 222 48 261 30 282 23" />
                        </svg>
                      </div>
                      <div className={styles.mapCaption}><span>COLLECTION ROUTE</span><span>Scheduled</span></div>
                    </div>
                  )}
                  {feature.visual === "lifecycle" && (
                    <div className={styles.lifecycleVisual} aria-hidden="true">
                      <div className={styles.lifecycleLine}>
                        <span className={styles.lifecycleProgress} />
                        {["Registered", "Inspection", "Processing", "Disposition"].map((stage, index) => (
                          <span className={styles.lifecycleStage} key={stage}>
                            <i className={index < 2 ? styles.stageComplete : ""} />
                            <small>{stage}</small>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {feature.visual === "security" && (
                    <div className={styles.securityVisual} aria-hidden="true">
                      <div className={styles.securityRing}><LockKeyhole size={23} /></div>
                      <span className={styles.securityLabel}>PROCESS<br />RECORDED</span>
                      <div className={styles.securityRows}>
                        <span><Check size={13} /> Sanitisation record</span>
                        <span><Check size={13} /> Evidence attached</span>
                      </div>
                    </div>
                  )}
                  {feature.visual === "custody" && (
                    <div className={styles.custodyVisual} aria-hidden="true">
                      <span><i /><b>Collection recorded</b><small>Custody event</small></span>
                      <span><i /><b>Facility received</b><small>Handover documented</small></span>
                      <span><i /><b>Certificate issued</b><small>Available in portal</small></span>
                    </div>
                  )}
                  {feature.visual === "sites" && (
                    <div className={styles.sitesVisual} aria-hidden="true">
                      <span><MapPin size={14} /><b>Site access</b><small>Central office</small></span>
                      <span><MapPin size={14} /><b>Site access</b><small>North facility</small></span>
                      <span><MapPin size={14} /><b>Site access</b><small>West depot</small></span>
                    </div>
                  )}
                  {feature.visual === "recovery" && (
                    <div className={styles.recoveryVisual} aria-hidden="true">
                      <span><Laptop size={17} /><b>Asset</b></span>
                      <ArrowRight size={17} />
                      <span className={styles.recoveryOutcomes}><i>Reuse</i><i>Recover</i><i>Recycle</i></span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <p className={styles.illustrationNote}>
            Platform illustrations are representative previews, not live customer data.
          </p>
        </div>
      </section>

      <section className={styles.journeySection} id="journey">
        <div className={styles.sectionShell}>
          <div className={styles.journeyHeading}>
            <div>
              <p className={styles.sectionKicker}>HOW IT WORKS</p>
              <h2>A clear path from pickup<br />to <span>documented outcome.</span></h2>
            </div>
            <p>Each stage builds on the last, creating an operational record of the asset journey.</p>
          </div>
          <div className={styles.journeyTrack}>
            <div className={styles.journeyRail} aria-hidden="true"><span /></div>
            {journeySteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article className={styles.journeyStep} key={step.title}>
                  <div className={styles.journeyIcon}><Icon size={19} strokeWidth={1.8} /></div>
                  <span className={styles.journeyNumber}>0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.securitySection} id="security">
        <div className={styles.securityGrid} aria-hidden="true" />
        <div className={styles.securityInner}>
          <div className={styles.securityCopy}>
            <p className={styles.darkKicker}><span /> SECURITY &amp; COMPLIANCE</p>
            <h2>Evidence at every step.<br /><span>Confidence in every record.</span></h2>
            <p className={styles.securityLead}>
              Keep custody events, data sanitisation records, evidence and
              certificate details connected to the operational workflow.
              Customer access stays within the authenticated portal.
            </p>
            <ul className={styles.securityList}>
              <li><CircleCheck size={17} /> Asset tracking and custody history</li>
              <li><CircleCheck size={17} /> Data processing records and evidence</li>
              <li><CircleCheck size={17} /> Controlled customer access to records</li>
              <li><CircleCheck size={17} /> Digital certificates with verification</li>
            </ul>
            <a className={styles.securityLink} href="#platform">
              Explore certificate records <ArrowRight size={16} />
            </a>
          </div>
          <div className={styles.securityArt} aria-hidden="true">
            <div className={styles.securityHalo} />
            <div className={styles.securityShield}><ShieldCheck size={80} strokeWidth={1.15} /></div>
            <div className={`${styles.securityTag} ${styles.securityTagTop}`}>
              <span><LockKeyhole size={15} /></span><b>DATA RECORD</b><small>Processing evidence</small>
            </div>
            <div className={`${styles.securityTag} ${styles.securityTagBottom}`}>
              <span><FileCheck2 size={15} /></span><b>CUSTODY EVENT</b><small>Documented handover</small>
            </div>
            <span className={`${styles.securitySpark} ${styles.sparkA}`} />
            <span className={`${styles.securitySpark} ${styles.sparkB}`} />
            <span className={`${styles.securitySpark} ${styles.sparkC}`} />
          </div>
        </div>
        <div className={styles.securityBottom}>
          <span>RECYTRACK</span><span>Operational visibility, with the supporting record.</span>
        </div>
      </section>

      <section className={styles.portalSection}>
        <div className={`${styles.sectionShell} ${styles.portalLayout}`}>
          <div className={styles.portalCopy}>
            <p className={styles.sectionKicker}>CUSTOMER PORTAL</p>
            <h2>Your operation,<br /><span>clearly in view.</span></h2>
            <p>
              A secure customer workspace for collection progress, registered
              assets and available certificates. Sign in to view the information
              associated with your account.
            </p>
            <Link className={styles.textLink} href="/login">
              Explore your customer portal <ArrowRight size={16} />
            </Link>
            <div className={styles.previewNotice}>
              <ShieldCheck size={16} />
              <span>Illustrative platform preview<br /><b>Demonstration content only</b></span>
            </div>
          </div>
          <div className={styles.dashboardFrame}>
            <div className={styles.dashboardTopbar}>
              <div className={styles.dashboardBrand}><span><Recycle size={13} /></span><b>RecyTrack</b></div>
              <span className={styles.demoBadge}>PLATFORM PREVIEW</span>
              <span className={styles.avatarDemo}>AC</span>
            </div>
            <div className={styles.dashboardBody}>
              <aside className={styles.dashboardRail} aria-hidden="true">
                <i className={styles.railActive} /><i /><i /><i /><i />
              </aside>
              <div className={styles.dashboardContent}>
                <div className={styles.dashboardGreeting}>
                  <div><small>CUSTOMER WORKSPACE</small><b>Lifecycle overview</b></div>
                  <span>All sites <ArrowDown size={12} /></span>
                </div>
                <div className={styles.dashboardStats}>
                  <div><small>COLLECTIONS</small><b><Truck size={15} /> In progress</b><i>Journey status</i></div>
                  <div><small>ASSET REGISTER</small><b><Box size={15} /> Lifecycle view</b><i>Tracked records</i></div>
                  <div><small>CERTIFICATES</small><b><FileCheck2 size={15} /> Available</b><i>Issued documents</i></div>
                </div>
                <div className={styles.dashboardPanels}>
                  <div className={styles.dashboardJourney}>
                    <div className={styles.panelHeading}><b>Collection journey</b><small>DEMONSTRATION</small></div>
                    <div className={styles.miniJourney}>
                      {["Requested", "Approved", "Collected", "Received"].map((label, index) => (
                        <span key={label} className={index < 2 ? styles.miniJourneyDone : ""}>
                          <i>{index < 2 ? <Check size={9} /> : null}</i>{label}
                        </span>
                      ))}
                    </div>
                    <div className={styles.activityPreview}><span><i /><b>Asset registered</b><small>Lifecycle event</small></span><ArrowUpRight size={14} /></div>
                  </div>
                  <div className={styles.dashboardDonut}>
                    <div className={styles.panelHeading}><b>Asset lifecycle</b><small>OVERVIEW</small></div>
                    <div className={styles.donutGraphic}><span>ASSET<br />STATUS</span></div>
                    <div className={styles.donutLegend}><i /> Processing <i /> Complete <i /> Other</div>
                  </div>
                </div>
                <div className={styles.dashboardFoot}><span><LockKeyhole size={12} /> Account-scoped information</span><span>Preview only · no customer data</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.sustainabilitySection} id="sustainability">
        <div className={styles.sectionShell}>
          <div className={styles.sustainabilityLayout}>
            <div className={styles.circularVisual} aria-hidden="true">
              <div className={styles.circularOrbit} />
              <div className={styles.circularCenter}><Recycle size={37} strokeWidth={1.5} /><span>CIRCULAR<br />USE</span></div>
              <span className={`${styles.circularNode} ${styles.circularNodeOne}`}><Laptop size={16} /></span>
              <span className={`${styles.circularNode} ${styles.circularNodeTwo}`}><Leaf size={17} /></span>
              <span className={`${styles.circularNode} ${styles.circularNodeThree}`}><Recycle size={16} /></span>
              <span className={styles.circularLabelOne}>REUSE</span>
              <span className={styles.circularLabelTwo}>RECOVER</span>
              <span className={styles.circularLabelThree}>RECYCLE</span>
            </div>
            <div className={styles.sustainabilityCopy}>
              <p className={styles.sectionKicker}>CIRCULAR IT</p>
              <h2>Keep useful technology<br /><span>in the loop.</span></h2>
              <p>
                Responsible IT asset disposition considers reuse and recovery
                where appropriate, with recycling as part of the wider lifecycle.
                RecyTrack records asset outcomes to support operational
                visibility and environmental reporting.
              </p>
              <div className={styles.sustainabilityPills}>
                <span><Check size={13} /> Refurbishment &amp; reuse</span>
                <span><Check size={13} /> Asset recovery</span>
                <span><Check size={13} /> Recycling records</span>
              </div>
              <small>Outcomes depend on asset condition and processing decisions. No impact estimates are implied.</small>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaOrb} aria-hidden="true" />
        <div className={styles.ctaInner}>
          <p className={styles.darkKicker}><span /> READY WHEN YOU ARE</p>
          <h2>Take control of your<br /><span>IT asset lifecycle.</span></h2>
          <p>Simplify IT recycling, protect your data and maintain visibility throughout the asset disposal process.</p>
          <div className={styles.ctaActions}>
            <PrimaryLink href="/register">Create customer account</PrimaryLink>
            <Link className={styles.ctaSignIn} href="/login">Sign in to portal <ArrowUpRight size={15} /></Link>
          </div>
        </div>
        <div className={styles.ctaEdge} aria-hidden="true"><span /><span /><span /></div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerMain}>
          <div className={styles.footerBrand}>
            <Link className={styles.brandLink} href="/"><BrandMark inverse /></Link>
            <p>Connected visibility for responsible IT asset disposition.</p>
          </div>
          <div className={styles.footerColumn}>
            <h2>Platform</h2>
            <a href="#platform">Capabilities</a>
            <a href="#journey">How it works</a>
            <a href="#security">Security &amp; compliance</a>
          </div>
          <div className={styles.footerColumn}>
            <h2>Customer access</h2>
            <Link href="/login">Customer portal</Link>
            <Link href="/register">Create account</Link>
            <a href="#security">Security &amp; compliance</a>
          </div>
          <div className={styles.footerColumn}>
            <h2>Explore</h2>
            <a href="#solutions">Solutions</a>
            <a href="#sustainability">Circular IT</a>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} RecyTrack by ENCIF</span>
          <span>Secure IT asset lifecycle management</span>
        </div>
      </footer>
    </main>
  );
}
