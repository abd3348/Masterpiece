/* Regenerate the proposed API contract and realistic JSON examples. */
const fs = require('fs');
const seed = JSON.parse(fs.readFileSync('data/campus-seed.json', 'utf8'));
const ref = (name) => ({ '$ref': '#/components/schemas/' + name });
const str = (extra = {}) => ({ type: 'string', ...extra }),
    num = (extra = {}) => ({ type: 'number', ...extra }),
    int = (extra = {}) => ({ type: 'integer', ...extra }),
    bool = { type: 'boolean' },
    array = (items) => ({ type: 'array', items });
const object = (properties, required = Object.keys(properties)) => ({
    type: 'object',
    properties,
    required,
    additionalProperties: false
});
const nullable = (name) => ({ ...schemas[name], nullable: true });
const schemas = {};
schemas.Media = object({ id: str(), name: str(), url: str({ format: 'uri' }) });
schemas.User = object(
    {
        id: str(),
        role: str({ enum: ['tenant', 'landlord', 'admin'] }),
        firstName: str(),
        lastName: str(),
        email: str({ format: 'email' }),
        phone: str(),
        city: str(),
        occupation: str({ nullable: true }),
        destination: str({ nullable: true }),
        active: bool
    },
    ['id', 'role', 'firstName', 'lastName', 'email', 'phone', 'city', 'active']
);
schemas.Register = object(
    {
        role: str({ enum: ['tenant', 'landlord'] }),
        firstName: str({ minLength: 2, maxLength: 60 }),
        lastName: str({ minLength: 2, maxLength: 60 }),
        email: str({ format: 'email', maxLength: 254 }),
        phone: str(),
        password: str({ minLength: 8, maxLength: 64, writeOnly: true }),
        city: str(),
        occupation: str(),
        destination: str()
    },
    ['role', 'firstName', 'lastName', 'email', 'phone', 'password', 'city']
);
schemas.Login = object({ email: str({ format: 'email' }), password: str({ writeOnly: true }) });
schemas.Profile = object(
    Object.fromEntries(
        ['firstName', 'lastName', 'email', 'phone', 'city', 'occupation', 'destination'].map(
            (k) => [k, schemas.User.properties[k]]
        )
    ),
    ['firstName', 'lastName', 'email', 'phone', 'city']
);
schemas.Preferences = object({
    minBudget: num({ minimum: 0 }),
    maxBudget: num({ minimum: 0 }),
    areas: array(str()),
    destination: str(),
    commute: int({ minimum: 1 }),
    housing: str({ enum: ['Apartment', 'Studio', 'Private room', 'Shared room'] }),
    furnishing: str({ enum: ['Furnished', 'Partly furnished', 'Unfurnished'] }),
    billing: str({ enum: ['Monthly', 'Daily / short stay'] }),
    roommates: str(),
    sleep: str({ enum: ['Early bird', 'Flexible', 'Night owl'] }),
    schedule: str({ enum: ['Daytime', 'Evenings', 'Flexible'] }),
    noise: int({ minimum: 1, maximum: 5 }),
    cleanliness: int({ minimum: 1, maximum: 5 }),
    smoking: str({ enum: ['Not allowed', 'Outside only', 'Fine with it'] }),
    habits: array(str())
});
schemas.ReviewInput = object({
    rating: int({ minimum: 1, maximum: 5 }),
    text: str({ minLength: 2, maxLength: 1000 })
});
schemas.Review = object({ name: str(), rating: int({ minimum: 1, maximum: 5 }), text: str() });
const listingFields = {
    title: str({ minLength: 3, maxLength: 100 }),
    city: str(),
    area: str(),
    type: str({ enum: ['Apartment', 'Studio', 'Private room', 'Shared room'] }),
    period: str({ enum: ['Monthly', 'Daily'] }),
    furnished: str({ enum: ['Furnished', 'Partly furnished', 'Unfurnished'] }),
    price: num({ exclusiveMinimum: true, minimum: 0 }),
    beds: int({ minimum: 1, maximum: 20 }),
    baths: int({ minimum: 1, maximum: 20 }),
    size: int({ minimum: 5, maximum: 9999 }),
    description: str({ minLength: 10, maxLength: 3000 }),
    availableFrom: str({ format: 'date' }),
    availableTo: str({ format: 'date' }),
    amenities: array(str()),
    photos: array(ref('Media')),
    video: nullable('Media')
};
schemas.ListingInput = object(listingFields);
schemas.ListingFee = object({ amount: num({ enum: [20] }), currency: str({ enum: ['JOD'] }), status: str({ enum: ['unpaid', 'paid'] }), simulated: bool, date: str({ format: 'date-time' }) }, ['amount', 'currency', 'status']);
schemas.Property = object({
    ...listingFields,
    id: int({ minimum: 1 }),
    ownerId: str(),
    landlord: str(),
    status: str({ enum: ['published', 'pending', 'archived', 'deleted', 'awaiting-fee'] }),
    listingFee: nullable('ListingFee'),
    photo: str({ nullable: true }),
    commute: int(),
    noise: int(),
    cleanliness: int(),
    smoking: str(),
    reviews: array(ref('Review')),
    risk: int({ minimum: 0, maximum: 100 }),
    riskReasons: array(str())
});
schemas.Roommate = object({
    id: str(),
    name: str(),
    occupation: str(),
    destination: str(),
    area: str(),
    minBudget: num(),
    maxBudget: num(),
    sleep: str(),
    schedule: str(),
    noise: int(),
    cleanliness: int(),
    smoking: str(),
    habits: array(str())
});
schemas.Roommate.properties.userId = str({ nullable: true, description: 'Real tenant account linked to this roommate profile; required server-side to deliver meeting invitations.' });
schemas.RequestInput = object({
    propertyId: int(),
    startDate: str({ format: 'date' }),
    duration: int({ minimum: 1, maximum: 365 }),
    roommate: bool,
    roommateId: str({
        nullable: true,
        description:
            'Required when roommate is true; null when renting alone. The tenant chooses the roommate profile.'
    }),
    message: str({ minLength: 2, maxLength: 2000 })
});
schemas.CheckItem = object({
    name: str(),
    condition: str({ enum: ['Good', 'Needs attention', 'Minor wear', 'Needs repair'] })
});
schemas.Inspection = object({ items: array(ref('CheckItem')), notes: str({ maxLength: 3000 }) });
schemas.ConditionInput = object({
    items: array(ref('CheckItem')),
    notes: str({ maxLength: 3000 }),
    video: ref('Media')
});
schemas.Condition = object({
    ...schemas.ConditionInput.properties,
    date: str({ format: 'date-time' })
});
schemas.RentalRequest = object({
    ...schemas.RequestInput.properties,
    id: str(),
    tenantId: str(),
    tenantName: str(),
    roommateName: str({
        nullable: true,
        description: 'Name snapshot resolved by the server from roommateId.'
    }),
    property: ref('Property'),
    status: str({
        enum: ['submitted', 'approved', 'inspection', 'payment', 'active', 'rejected', 'closed']
    }),
    createdAt: str({ format: 'date-time' }),
    deposit: num(),
    total: num(),
    endDate: str({ format: 'date' }),
    landlordAccepted: bool,
    tenantAccepted: bool,
    inspection: nullable('Inspection')
});
schemas.Payment = object({
    id: str(),
    amount: num(),
    date: str({ format: 'date-time' }),
    status: str(),
    description: str()
});
schemas.Rental = object({
    id: str(),
    request: ref('RentalRequest'),
    status: str({ enum: ['active', 'closed'] }),
    endDate: str({ format: 'date' }),
    payments: { ...array(ref('Payment')), maxItems: 0, description: 'Always empty: rent and deposits are handled directly by the parties.' },
    paymentMethod: str({ enum: ['direct-to-landlord'] }),
    moveInComplete: bool,
    conditions: object({ initial: nullable('Condition'), final: nullable('Condition') })
});
schemas.Contact = object(
    {
        id: str(),
        personId: str(),
        userId: str(),
        recipientId: str(),
        senderName: str(),
        status: str({ enum: ['pending', 'accepted', 'declined'] })
    },
    ['id', 'personId', 'userId', 'status']
);
schemas.Message = object({
    id: str(),
    senderId: str(),
    name: str(),
    text: str(),
    date: str({ format: 'date-time' })
});
schemas.Conversation = object({
    id: str(),
    peerName: str(),
    peerId: str(),
    kind: str({ enum: ['landlord', 'roommate'] }),
    participants: array(str()),
    messages: array(ref('Message'))
});
schemas.ReportInput = object({ reason: str(), notes: str({ minLength: 2, maxLength: 1500 }) });
schemas.Report = object({
    ...schemas.ReportInput.properties,
    id: str(),
    propertyId: int(),
    title: str(),
    status: str({ enum: ['open', 'resolved'] }),
    name: str(),
    date: str({ format: 'date-time' })
});
schemas.Activity = object({ id: str(), text: str(), date: str({ format: 'date-time' }) });
schemas.Notification = object({
    id: str(),
    text: str(),
    date: str({ format: 'date-time' }),
    read: bool
});
schemas.MeetingInput = object({
    kind: str({ enum: ['property', 'roommate'] }),
    targetId: { oneOf: [int(), str()] },
    peerId: str(),
    title: str({ minLength: 3, maxLength: 100 }),
    startsAt: str({ format: 'date-time' }),
    duration: int({ enum: [15, 30, 60] })
}, ['kind', 'targetId', 'title', 'startsAt', 'duration']);
schemas.Meeting = object({
    id: str(), kind: str({ enum: ['property', 'roommate'] }),
    targetId: { oneOf: [int(), str()] }, subject: str(), title: str(), startsAt: str({ format: 'date-time' }),
    duration: int({ enum: [15, 30, 60] }), creatorId: str(), creatorName: str(),
    recipientId: str(), recipientName: str(), participants: array(str()),
    status: str({ enum: ['pending', 'accepted', 'declined', 'cancelled'] }), createdAt: str({ format: 'date-time' })
});
schemas.MeetingRoom = object({ roomName: str(), displayName: str() });
schemas.Bootstrap = object({
    schemaVersion: int({ enum: [1] }),
    currentUser: nullable('User'),
    preferences: nullable('Preferences'),
    csrfToken: str({ nullable: true }),
    users: array(ref('User')),
    properties: array(ref('Property')),
    roommates: array(ref('Roommate')),
    requests: array(ref('RentalRequest')),
    rentals: array(ref('Rental')),
    contacts: array(ref('Contact')),
    conversations: array(ref('Conversation')),
    meetings: array(ref('Meeting')),
    reports: array(ref('Report')),
    activity: array(ref('Activity')),
    saved: array(int()),
    notifications: array(ref('Notification'))
});
schemas.ProblemDetails = {
    type: 'object',
    properties: {
        type: str(),
        title: str(),
        status: int(),
        detail: str(),
        instance: str(),
        traceId: str(),
        errors: { type: 'object', additionalProperties: array(str()) }
    },
    required: ['title', 'status']
};
schemas.Checkout = object({
    checkoutUrl: str({
        format: 'uri',
        description:
            'HTTPS provider URL for the landlord listing fee only. The server charges JD 20 and publishes only after verified payment and moderation. Never used for tenant rent or deposits.'
    })
});
schemas.ArrangementConfirmation = object({ rentalId: str() });
schemas.TextInput = object({ text: str({ minLength: 2, maxLength: 3000 }) });
schemas.AssistantReply = object({ text: str() });
schemas.RequestReview = object({ approved: bool, acceptedTerms: bool });
schemas.Acceptance = object({ accepted: bool });
schemas.Confirmation = object({ confirmed: bool });
schemas.UserStatus = object({ active: bool });
schemas.ListingStatus = object({ status: str({ enum: ['published', 'archived'] }) });
schemas.Moderation = object({ keep: bool });
schemas.ContactInput = object({ personId: str() });
schemas.ConversationInput = object({
    peerId: str(),
    kind: str({ enum: ['landlord', 'roommate'] })
});
const paths = {};
function route(path, method, summary, input, output, roles, success = 200) {
    const responses = {};
    responses[success] = {
        description: success === 204 ? 'No content' : 'Success',
        ...(success === 204
            ? {}
            : {
                  content: {
                      'application/json': {
                          schema: typeof output === 'string' ? ref(output) : output
                      }
                  }
              })
    };
    for (const code of [400, 401, 403, 404, 409, 500])
        responses[code] = {
            description: {
                400: 'Validation failed',
                401: 'Sign in required',
                403: 'Not allowed',
                404: 'Not found',
                409: 'State or booking conflict',
                500: 'Unexpected error'
            }[code],
            content: { 'application/problem+json': { schema: ref('ProblemDetails') } }
        };
    const operation = {
        summary,
        operationId: method + path.replace(/[^a-zA-Z]/g, ''),
        responses,
        security: roles ? [{ cookieAuth: [] }] : [],
        'x-roles': roles || ['public']
    };
    const params = [...path.matchAll(/\{(\w+)\}/g)].map(([_, name]) => ({
        name,
        in: 'path',
        required: true,
        schema:
            name === 'phase'
                ? str({ enum: ['initial', 'final'] })
                : path.startsWith('/properties') ||
                    path.startsWith('/admin/properties') ||
                    path.startsWith('/me/favorites')
                  ? int({ minimum: 1 })
                  : str()
    }));
    if (params.length) operation.parameters = params;
    if (input)
        operation.requestBody = {
            required: true,
            content: {
                'application/json': { schema: typeof input === 'string' ? ref(input) : input }
            }
        };
    if (!['get', 'head', 'options'].includes(method))
        operation.parameters = [
            ...(operation.parameters || []),
            {
                name: 'X-CSRF-TOKEN',
                in: 'header',
                required: true,
                schema: str(),
                description:
                    'Token obtained from bootstrap. Required for cookie-authenticated mutations.'
            }
        ];
    (paths[path] ||= {})[method] = operation;
}
route('/bootstrap', 'get', 'Role-scoped page data and CSRF token', null, 'Bootstrap', null);
route(
    '/auth/register',
    'post',
    'Create account and establish the session',
    'Register',
    'User',
    null,
    201
);
route('/auth/login', 'post', 'Sign in and establish the session', 'Login', 'User', null);
route(
    '/auth/logout',
    'post',
    'End the current session',
    null,
    null,
    ['tenant', 'landlord', 'admin'],
    204
);
route('/me/profile', 'put', 'Update your profile', 'Profile', 'User', [
    'tenant',
    'landlord',
    'admin'
]);
route('/me/preferences', 'get', 'Your preferences or null', null, nullable('Preferences'), [
    'tenant'
]);
route('/me/preferences', 'put', 'Save housing preferences', 'Preferences', 'Preferences', [
    'tenant'
]);
route('/me/preferences', 'delete', 'Reset preferences', null, null, ['tenant'], 204);
route('/me/favorites/{id}', 'put', 'Save a property', null, null, ['tenant'], 204);
route('/me/favorites/{id}', 'delete', 'Remove a saved property', null, null, ['tenant'], 204);
route('/properties', 'get', 'Published homes as a plain array', null, array(ref('Property')), null);
route(
    '/properties/{id}',
    'get',
    'Property details, with owner/admin previews',
    null,
    'Property',
    null
);
route('/meetings', 'get', 'Only meetings in which the signed-in user participates', null, array(ref('Meeting')), ['tenant', 'landlord']);
route('/meetings', 'post', 'Invite the property owner, a requesting tenant, or the account linked to a roommate profile; validate future time and duration', 'MeetingInput', 'Meeting', ['tenant', 'landlord'], 201);
route('/meetings/{id}/response', 'post', 'Recipient accepts or declines a pending future invitation; check participant schedule conflicts', 'Acceptance', 'Meeting', ['tenant', 'landlord']);
route('/meetings/{id}/cancel', 'post', 'Either participant cancels a pending or accepted meeting', null, 'Meeting', ['tenant', 'landlord']);
route('/meetings/{id}/room', 'get', 'Participant-only accepted meeting access from 10 minutes before start until scheduled end', null, 'MeetingRoom', ['tenant', 'landlord']);
route('/properties', 'post', 'Create a listing awaiting the JD 20 publication fee', 'ListingInput', 'Property', ['landlord'], 201);
route('/properties/{id}/listing-fee/checkout', 'post', 'Create a JD 20 landlord listing fee checkout; verify ownership and reject duplicate charges', null, 'Checkout', ['landlord']);
route('/properties/{id}', 'put', 'Edit your own listing', 'ListingInput', 'Property', ['landlord']);
route(
    '/properties/{id}/status',
    'put',
    'Publish or pause an owned listing',
    'ListingStatus',
    'Property',
    ['landlord']
);
route(
    '/properties/{id}/reviews',
    'post',
    'Add a property review; return updated property',
    'ReviewInput',
    'Property',
    ['tenant'],
    201
);
route(
    '/properties/{id}/reports',
    'post',
    'Report a listing',
    'ReportInput',
    'Report',
    ['tenant', 'landlord'],
    201
);
route(
    '/rental-requests',
    'get',
    'Requests belonging to the current tenant',
    null,
    array(ref('RentalRequest')),
    ['tenant']
);
route(
    '/rental-requests/{id}',
    'get',
    'Request accessible to its tenant or owner',
    null,
    'RentalRequest',
    ['tenant', 'landlord']
);
route(
    '/rental-requests',
    'post',
    'Create a rental request; server calculates price and availability',
    'RequestInput',
    'RentalRequest',
    ['tenant'],
    201
);
route(
    '/rental-requests/{id}/review',
    'post',
    'Property owner accepts or declines terms',
    'RequestReview',
    'RentalRequest',
    ['landlord']
);
route(
    '/rental-requests/{id}/agreement',
    'post',
    'Tenant accepts the agreement',
    'Acceptance',
    'RentalRequest',
    ['tenant']
);
route(
    '/rental-requests/{id}/inspection',
    'post',
    'Save the pre-handover checklist',
    'Inspection',
    'RentalRequest',
    ['tenant']
);
route(
    '/rental-requests/{id}/confirm-arrangement',
    'post',
    'Record directly agreed rental arrangements without collecting or verifying any rent or deposit',
    null,
    'ArrangementConfirmation',
    ['tenant']
);
route('/rentals', 'get', 'Your rentals as a plain array', null, array(ref('Rental')), ['tenant']);
route('/rentals/{id}/move-in', 'post', 'Confirm keys and handover', 'Confirmation', 'Rental', [
    'tenant'
]);
route(
    '/rentals/{id}/conditions/{phase}',
    'put',
    'Save a walkthrough and condition report',
    'ConditionInput',
    'Rental',
    ['tenant', 'landlord']
);
route(
    '/rentals/{id}/close',
    'post',
    'Close a rental after both reports',
    'Confirmation',
    'Rental',
    ['tenant', 'landlord']
);
route(
    '/roommate-contacts',
    'post',
    'Request contact with a roommate',
    'ContactInput',
    'Contact',
    ['tenant'],
    201
);
route(
    '/roommate-contacts/{id}/accept',
    'post',
    'Recipient accepts an incoming contact request',
    null,
    'Conversation',
    ['tenant']
);
route(
    '/conversations',
    'post',
    'Find or create a permitted conversation',
    'ConversationInput',
    'Conversation',
    ['tenant', 'landlord']
);
route(
    '/conversations/{id}/messages',
    'post',
    'Send a message to a conversation you belong to',
    'TextInput',
    'Conversation',
    ['tenant', 'landlord'],
    201
);
route('/admin/users/{id}/status', 'put', 'Suspend or restore a user', 'UserStatus', 'User', [
    'admin'
]);
route(
    '/admin/properties/{id}/review',
    'post',
    'Approve or remove a listing',
    'Moderation',
    'Property',
    ['admin']
);
route('/admin/reports/{id}/resolve', 'post', 'Resolve a community report', null, 'Report', [
    'admin'
]);
route('/assistant/messages', 'post', 'Answer a housing question', 'TextInput', 'AssistantReply', [
    'tenant',
    'landlord',
    'admin'
]);
route(
    '/media',
    'post',
    'Upload a media file; server returns its id and URL',
    null,
    'Media',
    ['tenant', 'landlord'],
    201
);
paths['/media'].post.requestBody = {
    required: true,
    content: { 'multipart/form-data': { schema: object({ file: str({ format: 'binary' }) }) } }
};
const spec = {
    openapi: '3.0.3',
    info: {
        title: 'Campus Mate — Proposed ASP.NET API',
        version: '1.0.0',
        description:
            'Frontend contract for a future backend. No ASP.NET backend is included. JSON uses camelCase keys; property ids are integers, other ids are strings. Bootstrap is role-scoped, never returns passwords, and supports an anonymous guest response.'
    },
    servers: [{ url: 'https://localhost:7001/api' }],
    paths,
    components: {
        securitySchemes: {
            cookieAuth: { type: 'apiKey', in: 'cookie', name: '.AspNetCore.Cookies' }
        },
        schemas
    }
};
fs.writeFileSync('docs/openapi.json', JSON.stringify(spec, null, 2) + '\n');
const user = seed.users[0];
const property = { ...seed.properties[0], tenantAccepted: undefined };
const request = {
    id: 'request-example',
    propertyId: 124,
    startDate: '2026-11-01',
    duration: 6,
    roommate: false,
    roommateId: null,
    message: 'I would like to rent this apartment.',
    tenantId: user.id,
    tenantName: user.firstName + ' ' + user.lastName,
    roommateName: null,
    property,
    status: 'submitted',
    createdAt: '2026-10-09T09:00:00Z',
    deposit: 190,
    total: 380,
    endDate: '2027-05-01',
    landlordAccepted: false,
    tenantAccepted: false,
    inspection: null
};
const snapshot = {
    schemaVersion: 1,
    currentUser: user,
    preferences: null,
    csrfToken: 'example-csrf-token',
    users: [],
    properties: seed.properties.filter((p) => p.status === 'published'),
    roommates: seed.roommates,
    requests: [request],
    rentals: [],
    contacts: [],
    conversations: [],
    meetings: [],
    reports: [],
    activity: [],
    saved: [124],
    notifications: []
};
const examples = {
    register: {
        role: 'tenant',
        firstName: 'Sara',
        lastName: 'Ahmad',
        email: 'sara@example.com',
        phone: '0791234567',
        password: 'ExamplePass1',
        city: 'Amman',
        occupation: 'Employee',
        destination: 'University of Jordan'
    },
    login: { email: 'tenant@example.com', password: 'ExamplePass1' },
    currentUser: user,
    preferences: {
        minBudget: 150,
        maxBudget: 220,
        areas: ['Jubeiha'],
        destination: 'University of Jordan',
        commute: 30,
        housing: 'Apartment',
        furnishing: 'Furnished',
        billing: 'Monthly',
        roommates: '1',
        sleep: 'Early bird',
        schedule: 'Daytime',
        noise: 2,
        cleanliness: 4,
        smoking: 'Not allowed',
        habits: ['Reading']
    },
    createRequest: {
        propertyId: 124,
        startDate: '2026-11-01',
        duration: 6,
        roommate: false,
        roommateId: null,
        message: 'I would like to rent this apartment.'
    },
    createRequestWithRoommate: {
        propertyId: 124,
        startDate: '2026-11-01',
        duration: 6,
        roommate: true,
        roommateId: seed.roommates[0].id,
        message: 'I will share the home with my chosen roommate.'
    },
    requestResponse: request,
    bootstrap: snapshot,
    mediaResponse: {
        id: 'media-example',
        name: 'walkthrough.mp4',
        url: 'https://localhost:7001/uploads/walkthrough.mp4'
    },
    conditionInput: {
        video: {
            id: 'media-example',
            name: 'walkthrough.mp4',
            url: 'https://localhost:7001/uploads/walkthrough.mp4'
        },
        items: [
            { name: 'Walls', condition: 'Good' },
            { name: 'Floors', condition: 'Good' },
            { name: 'Doors and windows', condition: 'Good' },
            { name: 'Furniture', condition: 'Minor wear' },
            { name: 'Water fittings', condition: 'Good' },
            { name: 'Appliances', condition: 'Good' }
        ],
        notes: 'A small scratch on the table was already present.'
    },
    checkoutResponse: { checkoutUrl: 'https://payments.example.com/listing-fee/example' },
    arrangementResponse: { rentalId: 'request-example' },
    validationError: {
        type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
        title: 'One or more validation errors occurred.',
        status: 400,
        errors: {
            email: ['Enter a valid email address.'],
            phone: ['Enter a valid Jordanian mobile number.']
        },
        traceId: 'example-trace-id'
    }
};
fs.writeFileSync('data/api-examples.json', JSON.stringify(examples, null, 2) + '\n');
