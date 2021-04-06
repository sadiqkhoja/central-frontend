import faker from 'faker';
import { DateTime } from 'luxon';
import { comparator, hasPath, lensPath, omit, set } from 'ramda';

import Field from '../../src/presenters/field';

import { dataStore, view } from './data-store';
import { extendedForms } from './forms';
import { extendedUsers } from './users';
import { fakePastDate, isBefore } from '../util/date-time';
import { toActor } from './actors';

const fakeDateTime = () => {
  const date = faker.random.boolean() ? faker.date.past() : faker.date.future();
  return DateTime.fromJSDate(date);
};

// Returns a random OData value for a particular field of a submission.
const odataValue = (field, instanceId) => {
  switch (field.type) {
    case 'int':
      return faker.random.number();
    case 'decimal':
      return faker.random.number({ precision: 0.00001 });
    case 'string': {
      const { path } = field;
      if (path === '/meta/instanceID' || path === '/instanceID')
        return instanceId;
      const paragraphs = faker.random.number({ min: 1, max: 3 });
      return faker.lorem.paragraphs(paragraphs);
    }
    case 'date': {
      return fakeDateTime().toFormat('yyyy-MM-dd');
    }
    case 'time': {
      const formatted = fakeDateTime().toFormat('HH:mm:ss');
      return faker.random.boolean() ? formatted : `${formatted}+01:00`;
    }
    case 'dateTime': {
      const formatted = fakeDateTime().toISO({ includeOffset: false });
      return faker.random.boolean() ? formatted : `${formatted}+01:00`;
    }
    case 'geopoint': {
      // [longitude, latitude], not [latitude, longitude]
      const coordinates = [
        faker.random.number({ min: -180, max: 180, precision: 0.0000000001 }),
        faker.random.number({ min: -85, max: 85, precision: 0.0000000001 })
      ];
      if (faker.random.boolean()) coordinates.push(faker.random.number());
      return { type: 'Point', coordinates };
    }
    case 'binary':
      return faker.system.commonFileName('jpg');
    case null:
      return faker.random.boolean() ? 'y' : 'n';
    default:
      throw new Error('invalid field type');
  }
};

// Returns random OData for a submission. `partial` seeds the OData.
const odata = (instanceId, fields, partial) => fields
  .map(field => new Field(field))
  .reduce(
    (data, field) => {
      if (field.type === 'repeat') return data;
      // `partial` may have already specified a value for the field.
      return hasPath(field.splitPath(), data)
        ? data
        : set(
          lensPath(field.splitPath()),
          field.type === 'structure' ? {} : odataValue(field, instanceId),
          data
        );
    },
    partial
  );

// eslint-disable-next-line import/prefer-default-export
export const extendedSubmissions = dataStore({
  factory: ({
    inPast,
    lastCreatedAt,

    // `form` is deprecated. Use formVersion instead.
    form = extendedForms.size !== 0
      ? extendedForms.first()
      // The lastSubmission property of the form will likely not match the
      // submission.
      : extendedForms.createPast(1, { submissions: 1 }).last(),
    formVersion = form,
    instanceId = faker.random.uuid(),

    submitter = extendedUsers.first(),
    attachmentsExpected = 0,
    attachmentsPresent = attachmentsExpected,
    status = null,
    reviewState = null,
    edits = null,
    deviceId = null,

    ...partialOData
  }) => {
    if (extendedUsers.size === 0) throw new Error('user not found');
    const createdAt = !inPast
      ? new Date().toISOString()
      : fakePastDate([
        lastCreatedAt,
        formVersion.publishedAt != null
          ? formVersion.publishedAt
          : formVersion.createdAt,
        submitter.createdAt
      ]);
    return {
      instanceId,
      deviceId,
      submitterId: submitter.id,
      submitter: toActor(submitter),
      createdAt,
      updatedAt: null,
      // An actual submission JSON response does not have this property. We
      // include it here so that it is easy to match submission data and
      // metadata during testing.
      _odata: odata(instanceId, formVersion._fields, {
        ...partialOData,
        __id: instanceId,
        __system: {
          submissionDate: createdAt,
          submitterId: submitter.id.toString(),
          submitterName: submitter.displayName,
          attachmentsPresent,
          attachmentsExpected,
          status,
          reviewState,
          edits,
          deviceId
        }
      })
    };
  },
  sort: comparator((submission1, submission2) =>
    isBefore(submission2.createdAt, submission1.createdAt))
});

export const standardSubmissions = view(
  extendedSubmissions,
  omit(['submitter'])
);

// Converts submission response objects to OData. Returns all data even for
// encrypted submissions.
export const submissionOData = (top = 250, skip = 0) => ({
  '@odata.count': extendedSubmissions.size,
  value: extendedSubmissions.sorted().slice(skip, skip + top)
    .map(submission => submission._odata)
});
