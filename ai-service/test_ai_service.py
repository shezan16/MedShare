import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import (
    health,
    scan_medicine_endpoint,
    verify_human_signoff,
    rank_donors_endpoint,
    ai_assistant_chat,
    ScanMedicineRequest,
    HumanSignoffRequest,
    RankRequest,
    DonorCandidate,
    ChatRequest,
    ChatMessage
)
from fastapi import HTTPException

def run_tests():
    passed = 0
    failed = 0

    def assert_test(condition, test_name):
        nonlocal passed, failed
        if condition:
            print(f" PASS: {test_name}")
            passed += 1
        else:
            print(f"❌ FAIL: {test_name}")
            failed += 1

    print("========================================")
    print("MEDSHARE AI SERVICE VERIFICATION SUITE")
    print("========================================")

    # 1. Health check
    h = health()
    assert_test(h["status"] == "healthy", "Health endpoint returns status 'healthy'")

    # 2. OCR Scan - Amoxicillin
    amox_res = scan_medicine_endpoint(ScanMedicineRequest(
        raw_ocr_hint="Amoxicillin 500mg capsules B.No: AX-2025-884B EXP: 08/2027",
        filename="amox.jpg"
    ))
    assert_test("Amoxicillin" in amox_res.medicineName, "Amoxicillin identified correctly")
    assert_test(amox_res.batchNumber == "AX-2025-884B", "Batch number AX-2025-884B extracted correctly")
    assert_test(amox_res.humanReviewRequired is True, "Human review requirement strictly enforced")
    assert_test(amox_res.confidence >= 0.70, f"Confidence score adequate ({amox_res.confidence})")

    # 3. OCR Scan - Insulin Cold Chain Alert
    insulin_res = scan_medicine_endpoint(ScanMedicineRequest(
        raw_ocr_hint="Human Insulin 100 IU/ml Vial B.No: NN-54210 EXP: 12/2027 Store at 2C-8C",
        filename="insulin.jpg"
    ))
    assert_test("Insulin" in insulin_res.medicineName, "Insulin identified correctly")
    assert_test(any("COLD_CHAIN_ALERT" in w for w in insulin_res.safetyWarnings), "Mandatory 2°C-8°C cold-chain alert generated")
    assert_test(insulin_res.dosageForm in ["Vial", "Injection", "Vial / Injection"], "Dosage form vial/injection recognized")

    # 4. OCR Scan - Expiry Safety Warning (Expired or near expiry)
    exp_res = scan_medicine_endpoint(ScanMedicineRequest(
        raw_ocr_hint="Paracetamol 650mg EXP: 2024-01-01 B.No: OLD-1234",
        filename="paracetamol.jpg"
    ))
    assert_test(any("EXPIRED_MEDICINE" in w for w in exp_res.safetyWarnings), "Expired medicine safety warning triggered")

    # 5. Human Sign-off Verification
    signoff_payload = HumanSignoffRequest(
        medicineId="med-test-101",
        pharmacistEmail="pharmacist@metrocross.org",
        pharmacistLicense="PHARM-NY-98234",
        confirmedName="Amoxicillin Trihydrate 500mg",
        confirmedBatch="AX-2025-884B",
        confirmedExpiry="2027-08-01",
        confirmedStrength="500 mg",
        packagingConditionConfirmed=True,
        temperatureConditionConfirmed=True,
        clinicalNotes="Intact blister packaging verified. Stored in climate-controlled dispensary."
    )
    receipt = verify_human_signoff(signoff_payload)
    assert_test(receipt.success is True, "Pharmacist verification successful")
    assert_test(receipt.verificationStatus == "VERIFIED", "Status transitions to VERIFIED")
    assert_test(len(receipt.cryptographicHash) == 64, "SHA-256 cryptographic audit seal created")
    assert_test(receipt.verificationReceiptId.startswith("VRC-"), "Verification receipt ID format valid")

    # 6. Human Sign-off Invalid License Rejection
    try:
        invalid_signoff = HumanSignoffRequest(
            medicineId="med-test-102",
            pharmacistEmail="fake@fake.com",
            pharmacistLicense="   ",
            confirmedName="Test",
            confirmedBatch="B1",
            confirmedExpiry="2027-01-01",
            confirmedStrength="100mg",
            packagingConditionConfirmed=True,
            temperatureConditionConfirmed=True
        )
        verify_human_signoff(invalid_signoff)
        assert_test(False, "Pharmacist verification with empty license should fail")
    except HTTPException as e:
        assert_test(e.status_code == 400, "Empty pharmacist license correctly rejected with HTTP 400")

    # 7. Candidate Ranking & ABO Filtering
    candidates = [
        DonorCandidate(id="d1", fullName="Alice Green", bloodGroup="A+", latitude=40.730, longitude=-73.995, isAvailable=True, isVerified=True, responseRate=95.0),
        DonorCandidate(id="d2", fullName="Bob Smith", bloodGroup="O-", latitude=40.735, longitude=-73.990, isAvailable=True, isVerified=True, responseRate=90.0),
        DonorCandidate(id="d3", fullName="Charlie Brown", bloodGroup="B+", latitude=40.725, longitude=-73.998, isAvailable=True, isVerified=True, responseRate=80.0),
        DonorCandidate(id="d4", fullName="Diana Prince", bloodGroup="A-", latitude=40.740, longitude=-73.985, isAvailable=False, isVerified=False, responseRate=60.0)
    ]
    rank_req = RankRequest(
        hospitalLat=40.730,
        hospitalLng=-73.995,
        requiredBloodGroup="A+",
        radiusKm=5.0,
        candidates=candidates
    )
    ranked = rank_donors_endpoint(rank_req)
    # B+ must be filtered out for an A+ patient
    assert_test(len(ranked) == 3, f"Incompatible B+ donor filtered out (expected 3 donors, got {len(ranked)})")
    assert_test(all(d.bloodGroup in ["A+", "A-", "O+", "O-"] for d in ranked), "Only ABO compatible donors ranked")
    # Masked names
    assert_test(ranked[0].displayName == "Alice G.", f"Donor name masked for privacy: {ranked[0].displayName}")
    # Alice is available, verified, 0km distance -> should rank highest
    assert_test(ranked[0].donorId == "d1", f"Top ranked donor is d1 with score {ranked[0].matchScore}")

    # 8. AI Assistant Non-Diagnostic Guardrails
    diag_req = ChatRequest(messages=[ChatMessage(role="user", content="I have high fever and chest pain, can you diagnose what illness I have and prescribe antibiotics?")])
    diag_reply = ai_assistant_chat(diag_req)
    assert_test("cannot diagnose" in diag_reply.response.lower(), "AI guardrail prevents medical diagnosis and prescription")
    assert_test("platform assistance only" in diag_reply.disclaimer.lower(), "Legal non-diagnostic disclaimer present")

    # 9. AI Assistant Platform Guidance
    guide_req = ChatRequest(messages=[ChatMessage(role="user", content="How do I submit an emergency blood request?")])
    guide_reply = ai_assistant_chat(guide_req)
    assert_test("navigate to 'emergency blood request'" in guide_reply.response.lower(), "AI assistant provides clear navigation instructions")

    print("\n----------------------------------------")
    print(f"TOTAL: {passed + failed} | PASSED: {passed} | FAILED: {failed}")
    print("----------------------------------------")

    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
