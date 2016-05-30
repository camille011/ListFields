Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    items: [
        {
        	html: "List Fields - Version Sandbox"
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
            fetch: ['ElementName', 'AttributeType'],
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
                            allowedvalues: _.map(nonEmptyValues, function (val) {
                                return val.get('StringValue');
                            }).join(',')
                        };
                    },
                    scope: this
                });
            }
        }, this);

        return Deft.Promise.all(promises);
    },

    _makeGrid: function (fields) {
        if (this.down('rallygrid')) {
            Ext.ComponentQuery.query('#gridContainer')[0].remove(Ext.ComponentQuery.query('#attributeGrid')[0], true);
        }
        console.log("makegrid fields", fields);
        var count = fields.length;
        if (count > 0) {
            Ext.ComponentQuery.query('#notifier')[0].update(count + ' custom fields found');
            var store = Ext.create('Rally.data.custom.Store', {
                fields: ['name', 'type', 'allowedvalues'],
                data: fields
            });
            console.log("store:", store);

            this.down('#gridContainer').add({
                xtype: 'rallygrid',
                itemId: 'attributeGrid',
                store: store,
                enableEditing: false,
                showRowActionsColumn: false,
                width: 700,
                columnCfgs: [
                    {text: 'Name', dataIndex: 'name', flex: 1},
                    {text: 'Type', dataIndex: 'type'},
                    {text: 'Allowed Values', dataIndex: 'allowedvalues', flex: 1}
                ]
            });
        } else {
            Ext.ComponentQuery.query('#notifier')[0].update('no custom fields found');
        }
    }
});
