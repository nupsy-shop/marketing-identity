#!/bin/bash
"""
Backend Test Suite for GA4 grantAccess Functionality
Tests the newly implemented GA4 plugin's ability to programmatically grant access 
to GA4 properties using the GA4 Admin API.
"""

BASE_URL="https://access-mgmt-2.preview.emergentagent.com"
PASSED=0
FAILED=0
TOTAL=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_result() {
    local test_name="$1"
    local passed="$2"
    local details="$3"
    
    TOTAL=$((TOTAL + 1))
    
    if [ "$passed" = "true" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
        FAILED=$((FAILED + 1))
    fi
    
    if [ -n "$details" ]; then
        echo -e "   Details: $details"
    fi
}

make_json_request() {
    local method="$1"
    local endpoint="$2"
    local json_data="$3"
    local expected_status="$4"
    
    if [ -z "$expected_status" ]; then
        expected_status="200"
    fi
    
    local response
    local status_code
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL/api$endpoint")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" "$BASE_URL/api$endpoint" \
            -H "Content-Type: application/json" \
            -d "$json_data")
    fi
    
    status_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    response_body=$(echo "$response" | sed -e 's/HTTPSTATUS\:.*//g')
    
    # Return status code and response body
    echo "$status_code|$response_body"
}

test_ga4_capabilities_named_invite() {
    echo -e "\n📊 Testing GA4 Capabilities Endpoints:"
    
    local result
    result=$(make_json_request "GET" "/plugins/ga4/capabilities/NAMED_INVITE" "" "200")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    local response_body=$(echo "$result" | cut -d'|' -f2)
    
    if [ "$status_code" = "200" ]; then
        # Parse JSON to check capabilities
        local can_grant=$(echo "$response_body" | grep -o '"canGrantAccess":[^,}]*' | cut -d':' -f2 | tr -d ' ')
        local can_verify=$(echo "$response_body" | grep -o '"canVerifyAccess":[^,}]*' | cut -d':' -f2 | tr -d ' ')
        local oauth_supported=$(echo "$response_body" | grep -o '"clientOAuthSupported":[^,}]*' | cut -d':' -f2 | tr -d ' ')
        
        if [ "$can_grant" = "true" ] && [ "$can_verify" = "true" ] && [ "$oauth_supported" = "true" ]; then
            log_result "GA4 Capabilities NAMED_INVITE" "true" "canGrantAccess: $can_grant, canVerifyAccess: $can_verify, clientOAuthSupported: $oauth_supported"
        else
            log_result "GA4 Capabilities NAMED_INVITE" "false" "Expected canGrantAccess=true, canVerifyAccess=true, clientOAuthSupported=true, got canGrantAccess=$can_grant, canVerifyAccess=$can_verify, clientOAuthSupported=$oauth_supported"
        fi
    else
        log_result "GA4 Capabilities NAMED_INVITE" "false" "HTTP $status_code"
    fi
}

test_ga4_capabilities_group_access() {
    local result
    result=$(make_json_request "GET" "/plugins/ga4/capabilities/GROUP_ACCESS" "" "200")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    local response_body=$(echo "$result" | cut -d'|' -f2)
    
    if [ "$status_code" = "200" ]; then
        local can_grant=$(echo "$response_body" | grep -o '"canGrantAccess":[^,}]*' | cut -d':' -f2 | tr -d ' ')
        local can_verify=$(echo "$response_body" | grep -o '"canVerifyAccess":[^,}]*' | cut -d':' -f2 | tr -d ' ')
        local oauth_supported=$(echo "$response_body" | grep -o '"clientOAuthSupported":[^,}]*' | cut -d':' -f2 | tr -d ' ')
        
        if [ "$can_grant" = "true" ] && [ "$can_verify" = "true" ] && [ "$oauth_supported" = "true" ]; then
            log_result "GA4 Capabilities GROUP_ACCESS" "true" "canGrantAccess: $can_grant, canVerifyAccess: $can_verify, clientOAuthSupported: $oauth_supported"
        else
            log_result "GA4 Capabilities GROUP_ACCESS" "false" "Expected canGrantAccess=true, canVerifyAccess=true, clientOAuthSupported=true, got canGrantAccess=$can_grant, canVerifyAccess=$can_verify, clientOAuthSupported=$oauth_supported"
        fi
    else
        log_result "GA4 Capabilities GROUP_ACCESS" "false" "HTTP $status_code"
    fi
}

test_ga4_capabilities_shared_account() {
    local result
    result=$(make_json_request "GET" "/plugins/ga4/capabilities/SHARED_ACCOUNT" "" "200")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    local response_body=$(echo "$result" | cut -d'|' -f2)
    
    if [ "$status_code" = "200" ]; then
        local can_grant=$(echo "$response_body" | grep -o '"canGrantAccess":[^,}]*' | cut -d':' -f2 | tr -d ' ')
        local can_verify=$(echo "$response_body" | grep -o '"canVerifyAccess":[^,}]*' | cut -d':' -f2 | tr -d ' ')
        local requires_evidence=$(echo "$response_body" | grep -o '"requiresEvidenceUpload":[^,}]*' | cut -d':' -f2 | tr -d ' ')
        
        if [ "$can_grant" = "false" ] && [ "$can_verify" = "false" ] && [ "$requires_evidence" = "true" ]; then
            log_result "GA4 Capabilities SHARED_ACCOUNT" "true" "canGrantAccess: $can_grant, canVerifyAccess: $can_verify, requiresEvidenceUpload: $requires_evidence"
        else
            log_result "GA4 Capabilities SHARED_ACCOUNT" "false" "Expected canGrantAccess=false, canVerifyAccess=false, requiresEvidenceUpload=true, got canGrantAccess=$can_grant, canVerifyAccess=$can_verify, requiresEvidenceUpload=$requires_evidence"
        fi
    else
        log_result "GA4 Capabilities SHARED_ACCOUNT" "false" "HTTP $status_code"
    fi
}

test_ga4_grant_access_endpoint_exists() {
    echo -e "\n🔐 Testing GA4 Grant Access Endpoint:"
    
    local result
    result=$(make_json_request "POST" "/oauth/ga4/grant-access" "{}" "400")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    local response_body=$(echo "$result" | cut -d'|' -f2)
    
    if [ "$status_code" = "400" ]; then
        if echo "$response_body" | grep -q "required"; then
            log_result "GA4 Grant Access Endpoint Exists" "true" "Endpoint exists and validates input"
        else
            log_result "GA4 Grant Access Endpoint Exists" "false" "Endpoint exists but unexpected error: $response_body"
        fi
    elif [ "$status_code" = "404" ]; then
        log_result "GA4 Grant Access Endpoint Exists" "false" "Grant access endpoint not found (404)"
    else
        log_result "GA4 Grant Access Endpoint Exists" "false" "Unexpected response: HTTP $status_code"
    fi
}

test_ga4_grant_access_missing_fields() {
    local payload='{"target": "123456789", "role": "viewer", "identity": "test@example.com", "accessItemType": "NAMED_INVITE"}'
    local result
    result=$(make_json_request "POST" "/oauth/ga4/grant-access" "$payload" "400")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    local response_body=$(echo "$result" | cut -d'|' -f2)
    
    if [ "$status_code" = "400" ]; then
        if echo "$response_body" | grep -q "accessToken.*required"; then
            log_result "GA4 Grant Access Missing Fields" "true" "Correctly returned 400 for missing accessToken"
        else
            log_result "GA4 Grant Access Missing Fields" "false" "400 status but unexpected error: $response_body"
        fi
    else
        log_result "GA4 Grant Access Missing Fields" "false" "Expected 400 status, got $status_code"
    fi
}

test_ga4_grant_access_fake_token() {
    local payload='{"accessToken": "fake_access_token_12345", "target": "123456789", "role": "viewer", "identity": "test@example.com", "accessItemType": "NAMED_INVITE"}'
    local result
    result=$(make_json_request "POST" "/oauth/ga4/grant-access" "$payload" "400")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    local response_body=$(echo "$result" | cut -d'|' -f2)
    
    # Accept 400, 401, 403 as valid error responses from Google API
    if [ "$status_code" = "400" ] || [ "$status_code" = "401" ] || [ "$status_code" = "403" ]; then
        log_result "GA4 Grant Access Fake Token" "true" "Correctly returned $status_code for fake token"
    else
        log_result "GA4 Grant Access Fake Token" "false" "Expected 400/401/403 status, got $status_code"
    fi
}

test_ga4_grant_access_shared_account() {
    local payload='{"accessToken": "fake_access_token_12345", "target": "123456789", "role": "viewer", "identity": "test@example.com", "accessItemType": "SHARED_ACCOUNT"}'
    local result
    result=$(make_json_request "POST" "/oauth/ga4/grant-access" "$payload" "400")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    local response_body=$(echo "$result" | cut -d'|' -f2)
    
    if [ "$status_code" = "400" ] || [ "$status_code" = "501" ]; then
        if echo "$response_body" | grep -qi "shared account\|pam\|cannot be granted"; then
            log_result "GA4 Grant Access SHARED_ACCOUNT" "true" "Correctly rejected SHARED_ACCOUNT with status $status_code"
        else
            log_result "GA4 Grant Access SHARED_ACCOUNT" "false" "Status $status_code but unexpected error: $response_body"
        fi
    else
        log_result "GA4 Grant Access SHARED_ACCOUNT" "false" "Expected 400/501 status, got $status_code"
    fi
}

test_ga4_oauth_status_regression() {
    echo -e "\n🔄 Testing GA4 Regression Scenarios:"
    
    local result
    result=$(make_json_request "GET" "/oauth/ga4/status" "" "200")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    local response_body=$(echo "$result" | cut -d'|' -f2)
    
    if [ "$status_code" = "200" ]; then
        local platform_key=$(echo "$response_body" | grep -o '"platformKey":"[^"]*"' | cut -d'"' -f4)
        local oauth_supported=$(echo "$response_body" | grep -o '"oauthSupported":[^,}]*' | cut -d':' -f2 | tr -d ' ')
        
        if [ "$platform_key" = "ga4" ] && [ "$oauth_supported" = "true" ]; then
            log_result "GA4 OAuth Status Regression" "true" "platformKey: $platform_key, oauthSupported: $oauth_supported"
        else
            log_result "GA4 OAuth Status Regression" "false" "Expected platformKey=ga4, oauthSupported=true, got platformKey=$platform_key, oauthSupported=$oauth_supported"
        fi
    else
        log_result "GA4 OAuth Status Regression" "false" "HTTP $status_code"
    fi
}

test_ga4_oauth_start_regression() {
    local payload='{"redirectUri": "'$BASE_URL'/api/oauth/callback", "scope": "AGENCY"}'
    local result
    result=$(make_json_request "POST" "/oauth/ga4/start" "$payload" "200")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    local response_body=$(echo "$result" | cut -d'|' -f2)
    
    if [ "$status_code" = "200" ]; then
        if echo "$response_body" | grep -q "accounts.google.com/oauth" && echo "$response_body" | grep -q "state"; then
            log_result "GA4 OAuth Start Regression" "true" "Generated valid OAuth URL with state"
        else
            log_result "GA4 OAuth Start Regression" "false" "Invalid OAuth response structure"
        fi
    else
        log_result "GA4 OAuth Start Regression" "false" "HTTP $status_code"
    fi
}

test_ga4_verify_access_regression() {
    local payload='{"accessToken": "fake_access_token_12345", "target": "123456789", "role": "viewer", "identity": "test@example.com", "accessItemType": "NAMED_INVITE"}'
    local result
    result=$(make_json_request "POST" "/oauth/ga4/verify-access" "$payload" "400")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    local response_body=$(echo "$result" | cut -d'|' -f2)
    
    # Accept 400, 401, 403 as valid responses for fake token
    if [ "$status_code" = "400" ] || [ "$status_code" = "401" ] || [ "$status_code" = "403" ]; then
        log_result "GA4 Verify Access Regression" "true" "Correctly returned $status_code for fake token"
    else
        log_result "GA4 Verify Access Regression" "false" "Expected 400/401/403 status, got $status_code"
    fi
}

test_ga4_capability_consistency() {
    echo -e "\n✅ Testing GA4 Capability Consistency:"
    
    local result
    result=$(make_json_request "GET" "/plugins/ga4/capabilities" "" "200")
    local status_code=$(echo "$result" | cut -d'|' -f1)
    local response_body=$(echo "$result" | cut -d'|' -f2)
    
    if [ "$status_code" = "200" ]; then
        local issues=""
        
        # Check NAMED_INVITE capabilities
        local named_invite_grant=$(echo "$response_body" | grep -A 20 '"NAMED_INVITE"' | grep '"canGrantAccess"' | head -1 | grep -o 'true\|false')
        local named_invite_verify=$(echo "$response_body" | grep -A 20 '"NAMED_INVITE"' | grep '"canVerifyAccess"' | head -1 | grep -o 'true\|false')
        local named_invite_oauth=$(echo "$response_body" | grep -A 20 '"NAMED_INVITE"' | grep '"clientOAuthSupported"' | head -1 | grep -o 'true\|false')
        
        # Check GROUP_ACCESS capabilities
        local group_access_grant=$(echo "$response_body" | grep -A 20 '"GROUP_ACCESS"' | grep '"canGrantAccess"' | head -1 | grep -o 'true\|false')
        local group_access_verify=$(echo "$response_body" | grep -A 20 '"GROUP_ACCESS"' | grep '"canVerifyAccess"' | head -1 | grep -o 'true\|false')
        local group_access_oauth=$(echo "$response_body" | grep -A 20 '"GROUP_ACCESS"' | grep '"clientOAuthSupported"' | head -1 | grep -o 'true\|false')
        
        # Check SHARED_ACCOUNT capabilities
        local shared_account_grant=$(echo "$response_body" | grep -A 20 '"SHARED_ACCOUNT"' | grep '"canGrantAccess"' | head -1 | grep -o 'true\|false')
        local shared_account_verify=$(echo "$response_body" | grep -A 20 '"SHARED_ACCOUNT"' | grep '"canVerifyAccess"' | head -1 | grep -o 'true\|false')
        local shared_account_evidence=$(echo "$response_body" | grep -A 20 '"SHARED_ACCOUNT"' | grep '"requiresEvidenceUpload"' | head -1 | grep -o 'true\|false')
        
        # Validate expectations
        if [ "$named_invite_grant" != "true" ]; then issues="$issues NAMED_INVITE.canGrantAccess"; fi
        if [ "$named_invite_verify" != "true" ]; then issues="$issues NAMED_INVITE.canVerifyAccess"; fi
        if [ "$named_invite_oauth" != "true" ]; then issues="$issues NAMED_INVITE.clientOAuthSupported"; fi
        
        if [ "$group_access_grant" != "true" ]; then issues="$issues GROUP_ACCESS.canGrantAccess"; fi
        if [ "$group_access_verify" != "true" ]; then issues="$issues GROUP_ACCESS.canVerifyAccess"; fi
        if [ "$group_access_oauth" != "true" ]; then issues="$issues GROUP_ACCESS.clientOAuthSupported"; fi
        
        if [ "$shared_account_grant" != "false" ]; then issues="$issues SHARED_ACCOUNT.canGrantAccess"; fi
        if [ "$shared_account_verify" != "false" ]; then issues="$issues SHARED_ACCOUNT.canVerifyAccess"; fi
        if [ "$shared_account_evidence" != "true" ]; then issues="$issues SHARED_ACCOUNT.requiresEvidenceUpload"; fi
        
        if [ -z "$issues" ]; then
            log_result "GA4 Capability Consistency" "true" "All access type capabilities match expected values"
        else
            log_result "GA4 Capability Consistency" "false" "Capability mismatches:$issues"
        fi
    else
        log_result "GA4 Capability Consistency" "false" "HTTP $status_code"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting GA4 Grant Access Functionality Tests${NC}"
    echo -e "${BLUE}🌍 Testing against: $BASE_URL${NC}"
    echo "================================================================================"
    
    # Run all tests
    test_ga4_capabilities_named_invite
    test_ga4_capabilities_group_access  
    test_ga4_capabilities_shared_account
    
    test_ga4_grant_access_endpoint_exists
    test_ga4_grant_access_missing_fields
    test_ga4_grant_access_fake_token
    test_ga4_grant_access_shared_account
    
    test_ga4_oauth_status_regression
    test_ga4_oauth_start_regression
    test_ga4_verify_access_regression
    
    test_ga4_capability_consistency
    
    # Print summary
    echo -e "\n================================================================================"
    echo -e "${BLUE}🎯 GA4 GRANT ACCESS TEST SUMMARY${NC}"
    echo "================================================================================"
    
    local success_rate=0
    if [ $TOTAL -gt 0 ]; then
        success_rate=$((PASSED * 100 / TOTAL))
    fi
    
    echo -e "${BLUE}📈 Success Rate: $success_rate% ($PASSED/$TOTAL tests passed)${NC}"
    
    if [ $FAILED -gt 0 ]; then
        echo -e "\n${RED}❌ FAILED TESTS ($FAILED):${NC}"
        echo "   Please review the implementation details above."
    fi
    
    if [ $PASSED -eq $TOTAL ]; then
        echo -e "\n${GREEN}🎉 ALL GA4 GRANT ACCESS TESTS PASSED! 🎉${NC}"
        echo -e "${GREEN}✅ The GA4 plugin grantAccess functionality is working correctly.${NC}"
        return 0
    else
        echo -e "\n${YELLOW}⚠️  $FAILED tests failed. Please review the implementation.${NC}"
        return 1
    fi
}

main "$@"