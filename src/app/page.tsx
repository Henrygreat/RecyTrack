import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPostLoginRedirect } from "@/lib/user-redirect";
import {
  Shield,
  Truck,
  Package,
  FileCheck,
  BarChart3,
  Users,
  ChevronRight,
  CheckCircle2,
  Lock,
  Recycle,
} from "lucide-react";

/**
 * Public Landing Page
 *
 * Professional landing page for RecyTrack.
 * Authenticated users are redirected to their appropriate dashboard.
 */
export default async function LandingPage() {
  // Check if user is already authenticated
  const session = await auth();

  if (session?.user?.id) {
    const redirectPath = await getPostLoginRedirect(session.user.id);
    redirect(redirectPath);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <Recycle className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">
                Recy<span className="text-teal-600">Track</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
              >
                Get Started
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              Secure IT Asset Disposal
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
              Professional IT Recycling{" "}
              <span className="text-teal-600">Operations Management</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed">
              End-to-end tracking for IT asset collection, secure data destruction,
              and compliant recycling. Full chain of custody with auditable certificates.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/25"
              >
                Create Customer Account
                <ChevronRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Sign In to Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              A streamlined process from collection to certified destruction
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                icon: Users,
                title: "Book Collection",
                description:
                  "Schedule a collection through the customer portal. Choose your preferred date and site.",
              },
              {
                step: "2",
                icon: Truck,
                title: "Secure Collection",
                description:
                  "Our team collects your IT assets with full chain of custody documentation.",
              },
              {
                step: "3",
                icon: Lock,
                title: "Data Destruction",
                description:
                  "Certified data erasure or physical destruction to industry standards.",
              },
              {
                step: "4",
                icon: FileCheck,
                title: "Certification",
                description:
                  "Receive detailed certificates for compliance and audit purposes.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-4 border border-teal-100">
                    <item.icon className="w-8 h-8 text-teal-600" />
                  </div>
                  <div className="absolute -top-2 -left-2 w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Complete IT Asset Lifecycle Management
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Everything you need to manage secure IT asset disposal
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Truck,
                title: "Collection Booking",
                description:
                  "Book and manage collections with flexible scheduling, site selection, and real-time status updates.",
                features: ["Online booking", "Multiple sites", "Status tracking"],
              },
              {
                icon: Shield,
                title: "Secure Data Erasure",
                description:
                  "Certified data destruction using industry-standard methods with full audit trails.",
                features: ["Multiple methods", "Evidence capture", "Verification"],
              },
              {
                icon: Package,
                title: "Asset Tracking",
                description:
                  "Track every asset from collection through processing with barcode scanning.",
                features: ["Barcode scanning", "Location tracking", "Status history"],
              },
              {
                icon: Lock,
                title: "Chain of Custody",
                description:
                  "Complete audit trail with digital signatures at every handover point.",
                features: ["Digital signatures", "Photo evidence", "Timestamps"],
              },
              {
                icon: FileCheck,
                title: "Certificates",
                description:
                  "Generate compliance certificates for data destruction and recycling.",
                features: ["PDF generation", "Verification codes", "Audit ready"],
              },
              {
                icon: BarChart3,
                title: "Reporting",
                description:
                  "Comprehensive reports on collections, assets, and environmental impact.",
                features: ["Custom reports", "Export options", "Analytics"],
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-200"
              >
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.features.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-slate-600"
                    >
                      <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Portal Benefits */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                Customer Portal
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Self-service access to manage your IT recycling operations.
                Book collections, track assets, and download certificates
                anytime.
              </p>
              <ul className="space-y-4">
                {[
                  "Book and manage collection requests",
                  "Track asset status in real-time",
                  "View and download destruction certificates",
                  "Access historical data and reports",
                  "Manage multiple sites and users",
                  "Receive email notifications",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 text-base font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Create Your Account
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
            <div className="bg-slate-100 rounded-2xl p-8 lg:p-12">
              <div className="bg-white rounded-xl shadow-xl p-6 border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
                    <Recycle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">
                      Customer Portal
                    </div>
                    <div className="text-sm text-slate-500">
                      Secure access to your data
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-3 bg-slate-100 rounded-full w-full" />
                  <div className="h-3 bg-slate-100 rounded-full w-4/5" />
                  <div className="h-3 bg-slate-100 rounded-full w-3/5" />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-teal-600">24</div>
                    <div className="text-xs text-slate-500">Active Assets</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-teal-600">3</div>
                    <div className="text-xs text-slate-500">Collections</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            Create your customer account to book collections and track your
            IT asset recycling operations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-slate-900 bg-white rounded-lg hover:bg-slate-100 transition-colors"
            >
              Create Customer Account
              <ChevronRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white border border-slate-600 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <Recycle className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Recy<span className="text-teal-400">Track</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
              <Link href="/login" className="hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/register" className="hover:text-white transition-colors">
                Register
              </Link>
              <span className="text-slate-600">|</span>
              <span>Secure IT Asset Disposal</span>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
            <p>
              RecyTrack by ENCIF. Professional IT recycling operations management.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
