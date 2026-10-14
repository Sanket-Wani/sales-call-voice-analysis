const { PrismaClient } = require("@prisma/client");
process.env.DATABASE_URL = "file:../data/sales_call.db";
const prisma = new PrismaClient();

const nivanAudit = {
  overall_judgment: "The representative demonstrated strong responsiveness and product catalog versatility, successfully pivoting from an unlaunched project (Nivan Skylark) to available inventory (Nirvana plots and Nivan Meadows bungalows). However, she prematurely disclosed price negotiability without qualifying the buyer's budget, failed to ask open-ended qualification questions, and missed capturing the customer's full requirements before agreeing to send WhatsApp details.",
  positive_points: [
    "Quick cross-selling agility: Seamlessly guided Rushikesh Dave from the unlaunched Skylark project to alternative ready plots at Nirvana and bungalows at Meadows.",
    "Transparent project status: Honestly communicated that Nivan Skylark is under approval and not yet launched, preventing false expectations.",
    "Polite and approachable tone: Maintained a welcoming demeanor and natural language code-switching throughout the inquiry."
  ],
  neutral_points: [
    "Language code-switching: Fluidly shifted between Marathi, Hindi, and English matching the local customer's dialect, which aided rapport.",
    "Promised WhatsApp follow-up: Accepted sending brochure details directly to the customer's number."
  ],
  negative_points: [
    "Premature price concession: Voluntarily stated '₹2000 per sq ft negotiable' before the customer even objected or asked for a discount, eroding pricing power.",
    "Lack of discovery questioning: Did not ask why the customer is buying (end-use vs. investment), preferred move-in timeline, or specific budget limits.",
    "Passive call closing: Concluded with 'I will send details' instead of locking in a scheduled date for a site visit."
  ],
  scope_of_improvement: [
    "Protect rate integrity: Quote the official rate first and explore customer reaction before volunteering that prices are negotiable.",
    "Qualify before sharing collateral: Ask 2-3 qualifying questions (e.g., 'Are you looking for personal living or investment?') before sending brochures.",
    "Call-to-action closing: Propose an in-person site visit to walk the plots rather than leaving the ball entirely in the customer's court via WhatsApp."
  ],
  behavioral_flags: [
    {
      flag_type: "Premature Price Concession",
      severity: "Medium",
      description: "Representative volunteered price negotiability ('negotiable hai sir') without customer pushback, prematurely weakening commercial posture.",
      timestamp_reference: 133.99,
      time_span: "2:13 - 2:17",
      verbatim_quote: "दोन हजार per square feet negotiable आहे sir",
      claim_linked: "The rate for plots in Nirvana is 2000 per square feet and is negotiable."
    }
  ]
};

const asifAudit = {
  overall_judgment: "Representative Asif conducted a focused, professional follow-up call with Nandan Sir. He immediately contextualized the reason for calling by referencing the customer's prior site visit with colleague Rajesh, demonstrating account continuity. He remained polite, respected the customer's travel commitments in Chennai, and secured agreement on a post-Ganpati follow-up window without being overly aggressive.",
  positive_points: [
    "Immediate and accurate context setting: Directly referenced Nandan Sir's earlier site visit with Rajesh.",
    "Courteous and non-intrusive: Graciously accepted that the customer was out of town in Chennai without pushing for immediate commitments.",
    "Timely calendar anchor: Anchored the next interaction around a culturally relevant milestone (after the Ganpati festival)."
  ],
  neutral_points: [
    "Conversation was transactional and brief (approx. 32 seconds), sufficient for a scheduling touchpoint but offered no value-add discussion on plot availability or new updates.",
    "Did not ask what specific feedback or questions Nandan Sir or his family had from the previous visit."
  ],
  negative_points: [
    "Missed discovery opportunity: Did not confirm whether the customer received any previous brochures or if requirements had changed.",
    "No digital touchpoint offered: Failed to offer sending a digital brochure or project update on WhatsApp during the customer's travel period."
  ],
  scope_of_improvement: [
    "Offer proactive collateral: Rather than concluding with just 'chalega', the rep should say: 'Sure sir, while you are in Chennai, may I WhatsApp you our latest layout plan so you and your family can review it before returning?'",
    "Confirm tentative day: Instead of a vague 'Ganpati ke baad', propose a tentative weekday or weekend slot (e.g. 'Shall I connect with you on Tuesday post-visarjan?')."
  ],
  behavioral_flags: [
    {
      flag_type: "None",
      severity: "Clean",
      description: "No arrogance, misleading statements, or unprofessional conduct detected. Communication was polite, respectful, and appropriately timed."
    }
  ]
};

async function run() {
  await prisma.callAnalysis.updateMany({
    where: { callId: "call_nivan_skylark_01" },
    data: {
      salesPerformanceJson: JSON.stringify(nivanAudit)
    }
  });

  await prisma.callAnalysis.updateMany({
    where: { callId: "call_asif_followup_02" },
    data: {
      salesPerformanceJson: JSON.stringify(asifAudit)
    }
  });

  console.log("Updated both audits locally!");
}

run().catch(console.error).finally(() => prisma.$disconnect());

