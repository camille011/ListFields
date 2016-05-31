Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    items: [
        {
            html: "List Custom Fields - Version 2.0.1"
        },
        {
            xtype: 'component',
            itemId: 'notifier',
            margin: 10
        },
        {
            xtype: 'container',
            itemId: 'boxContainer'
        },
        {
            xtype: 'container',
            itemId: 'gridContainer'
        }
            ],

    launch: function () {
        var filters = Rally.data.wsapi.Filter.or([
            {
                property: 'ElementName',
                operator: '=',
                value: 'Defect'
            },
            {
                property: 'ElementName',
                operator: '=',
                value: 'HierarchicalRequirement'
            },
            {
                property: 'ElementName',
                operator: '=',
                value: 'TestCase'
            },
            {
                property: 'ElementName',
                operator: '=',
                value: 'Task'
            },
            {
                property: 'ElementName',
                operator: '=',
                value: 'PortfolioItem'
            },
            {
                property: 'ElementName',
                operator: '=',
                value: 'Workspace'
            },
            {
                property: 'ElementName',
                operator: '=',
                value: 'User'
            },
            {
                property: 'ElementName',
                operator: '=',
                value: 'DefectSuite'
            },
            {
                property: 'ElementName',
                operator: '=',
                value: 'Iteration'
            },
            {
                property: 'ElementName',
                operator: '=',
                value: 'Milestone'
            },
            {
                property: 'ElementName',
                operator: '=',
                value: 'Project'
            },
            {
                property: 'ElementName',
                operator: '=',
                value: 'Release'
            },
            {
                property: 'ElementName',
                operator: '=',
                value: 'TestCaseResult'
            },
            {
                property: 'ElementName',
                operator: '=',
                value: 'TestSet'
            }
        ]);

        this.down('#boxContainer').add({
            xtype: 'rallycombobox',
            itemId: 'typeDefCombobox',
            fieldLabel: 'Select a Type',
            margin: 10,
            width: 300,
            storeConfig: {
                autoLoad: true,
                model: 'TypeDefinition',
                fetch: ['Attributes', 'ElementName'],
                valueField: 'ElementName',
                filters: [filters],
                limit: Infinity,
                context: {
                    workspace: this.getContext().getWorkspaceRef()
                }
            },
            listeners: {
                ready: function (combobox) {
                    this._loadCustomFields(combobox.getRecord());
                },
                select: function (combobox) {
                    this._loadCustomFields(combobox.getRecord());
                },
                scope: this
            }
        });
    },

    _loadCustomFields: function (record) {
        var attributes = record.getCollection('Attributes', {
            limit: Infinity
        });
        var fieldsArray = [];

        attributes.load({
            fetch: ['ElementName', 'AttributeType', 'MaxLength', 'Hidden', 'Project'],
            filters: [{
                property: 'Custom',
                value: true
            }]
        }).then({
            success: this._loadAllowedValues,
            scope: this
        }).then({
            success: this._makeGrid,
            scope: this
        });
    },

    _loadAllowedValues: function (fields) {
        var promises = _.map(fields, function (field) {
            if (field.get('AttributeType') !== 'STRING') {
                return Deft.Promise.when({
                    name: field.get('ElementName'),
                    type: field.get('AttributeType'),
                    fieldLength: field.get('MaxLength'),
                    fieldHidden: field.get('Hidden'),
                    allowedvalues: 'n/a'
                });
            } else {
                var allowed = field.getCollection('AllowedValues');
                return allowed.load({
                    fetch: ['StringValue']
                }).then({
                    success: function (values) {
                        var nonEmptyValues = _.reject(values, function (value) {
                            return value.get('StringValue') === '';
                        });
                        return {
                            name: field.get('ElementName'),
                            type: field.get('AttributeType'),
                            fieldLength: field.get('MaxLength'),
                            fieldHidden: field.get('Hidden'),
                            allowedvalues: _.map(nonEmptyValues, function (val) {
                                return val.get('StringValue');
                            }).join(',')
                        };
                    },
                    scope: this
                });
            }
        }, this);
console.log(fields);
        if (fields.length === 0) {
            Ext.ComponentQuery.query('#notifier')[0].update('NO custom fields found for ' + Ext.ComponentQuery.query('#typeDefCombobox')[0].rawValue);
            Ext.ComponentQuery.query('#gridContainer')[0].remove(Ext.ComponentQuery.query('#attributeGrid')[0], true);
        }
        return Deft.Promise.all(promises);
    },

    _makeGrid: function (fields) {
        if (this.down('rallygrid')) {
            Ext.ComponentQuery.query('#gridContainer')[0].remove(Ext.ComponentQuery.query('#attributeGrid')[0], true);
        }
        var count = fields.length;
        if (count > 0) {
            Ext.ComponentQuery.query('#notifier')[0].update(count + ' custom field(s) found for ' + Ext.ComponentQuery.query('#typeDefCombobox')[0].rawValue);
            var store = Ext.create('Rally.data.custom.Store', {
                fields: ['name', 'type', 'allowedvalues', 'fieldLength', 'fieldHidden'],
                data: fields
            });

            this.down('#gridContainer').add({
                xtype: 'rallygrid',
                itemId: 'attributeGrid',
                store: store,
                enableEditing: false,
                showRowActionsColumn: false,
                columnCfgs: [
                    {text: 'Name', dataIndex: 'name', flex: 1},
                    {text: 'Type', dataIndex: 'type'},
                    {text: 'Max Length', dataIndex: 'fieldLength'},
                    {text: 'Hidden', dataIndex: 'fieldHidden'},
                    {text: 'Allowed Values', dataIndex: 'allowedvalues', flex: 1}
                    
                ]
            });
        } else {
            Ext.ComponentQuery.query('#notifier')[0].update('NO custom fields found');
            Ext.ComponentQuery.query('#gridContainer')[0].remove(Ext.ComponentQuery.query('#attributeGrid')[0], true);
        }
    }
});